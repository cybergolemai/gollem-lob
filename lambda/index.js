// lambda/index.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { SecretsManager } = require('@aws-sdk/client-secrets-manager');
const Stripe = require('stripe');
const { Decimal } = require('decimal.js');

// Configure Decimal.js for financial calculations
Decimal.set({ 
  precision: 20,  // High precision for intermediate calculations
  rounding: Decimal.ROUND_DOWN,  // Always round down for safety
  toExpNeg: -8,   // Show as decimal rather than exponential
  toExpPos: 20
});

// Initialize AWS and gRPC clients
const MATCHER_HOST = process.env.MATCHER_HOST || 'matcher.gollem.internal';
const MATCHER_PORT = process.env.MATCHER_PORT || '50051';

const packageDefinition = protoLoader.loadSync('matcher.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const matcherProto = grpc.loadPackageDefinition(packageDefinition).matcher;
const client = new matcherProto.MatcherService(
  `${MATCHER_HOST}:${MATCHER_PORT}`, 
  grpc.credentials.createInsecure()
);

const dynamodb = new DynamoDB();
const secretsManager = new SecretsManager();
let stripe;

// Initialize Stripe with secret from SecretsManager
async function initializeStripe() {
  if (!stripe) {
    const { SecretString } = await secretsManager.getSecretValue({
      SecretId: process.env.STRIPE_SECRET_NAME
    });
    const { secretKey } = JSON.parse(SecretString);
    stripe = new Stripe(secretKey);
  }
  return stripe;
}

exports.handler = async (event, context) => {
  const path = event.requestContext.http.path;
  const method = event.requestContext.http.method;

  try {
    switch (`${method} ${path}`) {
      case 'POST /api/generate':
        return await handleGenerate(event);
      case 'GET /api/orderbook/status':
        return await handleOrderBookStatus(event);
      case 'GET /api/provider/circuit':
        return await handleCircuitStatus(event);
      case 'GET /api/provider/ratelimit':
        return await handleRateLimitStatus(event);
      case 'GET /api/provider/latency':
        return await handleLatencyMetrics(event);
      case 'POST /api/provider/status':
        return await handleProviderStatus(event);
      case 'POST /api/payments/create-intent':
        return await handleCreatePaymentIntent(event);
      case 'GET /api/payments/balance':
        return await handleGetBalance(event);
      case 'POST /webhooks/stripe':
        return await handleStripeWebhook(event);
      default:
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Not found' })
        };
    }
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: error.code === grpc.status.NOT_FOUND ? 404 : 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Financial Utility Functions
async function getUserBalance(userId) {
  const result = await dynamodb.query({
    TableName: process.env.LEDGER_TABLE_NAME,
    IndexName: 'user-transactions',
    KeyConditionExpression: 'user_id = :userId',
    ExpressionAttributeValues: {
      ':userId': { S: userId }
    },
    ScanIndexForward: false,
    Limit: 1
  });

  return result.Items?.[0]?.balance_after?.N ?? '0.00000000';
}

async function recordTransaction(params) {
  const {
    userId,
    amount,         // Decimal instance
    type,
    metadata = {},
    previousBalance // Decimal instance
  } = params;

  const timestamp = Date.now();
  const newBalance = previousBalance.plus(amount).toFixed(8);

  await dynamodb.putItem({
    TableName: process.env.LEDGER_TABLE_NAME,
    Item: {
      transaction_id: { S: `tr_${timestamp}` },
      user_id: { S: userId },
      amount: { N: amount.toFixed(8) },
      balance_after: { N: newBalance },
      type: { S: type },
      timestamp: { N: timestamp.toString() },
      metadata: { M: Object.fromEntries(
        Object.entries(metadata).map(([k, v]) => [k, { S: v.toString() }])
      )}
    }
  });

  // Audit log
  await dynamodb.putItem({
    TableName: process.env.AUDIT_LOG_TABLE,
    Item: {
      audit_id: { S: `audit_${timestamp}` },
      transaction_id: { S: `tr_${timestamp}` },
      user_id: { S: userId },
      amount: { N: amount.toFixed(8) },
      previous_balance: { N: previousBalance.toFixed(8) },
      new_balance: { N: newBalance },
      type: { S: type },
      timestamp: { N: timestamp.toString() }
    }
  });

  return newBalance;
}

// Payment Handlers
async function handleCreatePaymentIntent(event) {
  const { amount } = JSON.parse(event.body);
  const userId = event.requestContext.authorizer?.userId;
  
  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  const stripe = await initializeStripe();
  
  try {
    // Convert dollars to cents with precise decimal arithmetic
    const amountDecimal = new Decimal(amount);
    const amountInCents = amountDecimal
      .mul(100)
      .toDecimalPlaces(0, Decimal.ROUND_DOWN)
      .toNumber();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: { 
        userId,
        originalAmount: amount,
        amountInCents: amountInCents.toString()
      },
      automatic_payment_methods: {
        enabled: true
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret
      })
    };
  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message })
    };
  }
}

async function handleGetBalance(event) {
  const userId = event.requestContext.authorizer?.userId;
  
  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const balance = await getUserBalance(userId);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        balance,
        formatted: new Decimal(balance).toFixed(8)
      })
    };
  } catch (error) {
    console.error('Balance retrieval error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to retrieve balance' })
    };
  }
}

async function handleStripeWebhook(event) {
  const stripe = await initializeStripe();
  const sig = event.headers['stripe-signature'];
  
  try {
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (stripeEvent.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = stripeEvent.data.object;
        const amountInCents = new Decimal(paymentIntent.amount);
        const amountInDollars = amountInCents.div(100);
        
        const currentBalance = new Decimal(
          await getUserBalance(paymentIntent.metadata.userId)
        );

        await recordTransaction({
          userId: paymentIntent.metadata.userId,
          amount: amountInDollars,
          type: 'credit_purchase',
          metadata: {
            payment_intent_id: paymentIntent.id,
            original_amount_cents: paymentIntent.amount
          },
          previousBalance: currentBalance
        });
        break;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (err) {
    console.error('Webhook error:', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: err.message })
    };
  }
}

// Modified Generate Handler with Credit Management
async function handleGenerate(event) {
  const { model, prompt } = JSON.parse(event.body);
  const userId = event.requestContext.authorizer?.userId;

  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  // Calculate required credits using decimal arithmetic
  const requiredCredits = new Decimal(prompt.length).div(4).ceil();
  const currentBalance = new Decimal(await getUserBalance(userId));

  if (currentBalance.lessThan(requiredCredits)) {
    return {
      statusCode: 402,
      body: JSON.stringify({ 
        error: 'Insufficient credits',
        required: requiredCredits.toFixed(8),
        balance: currentBalance.toFixed(8)
      })
    };
  }
  
  const bid = {
    model: model,
    prompt: prompt,
    maxPrice: event.headers['x-max-price'] || '0.001',
    maxLatency: parseInt(event.headers['x-max-latency'] || '1000'),
    timestamp: Date.now().toString()
  };

  // Find matching provider
  const response = await new Promise((resolve, reject) => {
    client.submitBid({ bid }, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });

  // Deduct credits after successful matching
  try {
    await recordTransaction({
      userId,
      amount: requiredCredits.negated(), // Convert to negative for deduction
      type: 'inference_usage',
      metadata: {
        provider_id: response.provider_id,
        model,
        prompt_length: prompt.length.toString()
      },
      previousBalance: currentBalance
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Credit deduction error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process credits' })
    };
  }
}

// Remaining handlers with safety checks
async function handleOrderBookStatus(event) {
  const model = event.queryStringParameters?.model;

  const response = await new Promise((resolve, reject) => {
    client.getOrderBookStatus({ model }, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });

  // Convert any price values in response to proper decimal strings
  if (response.min_price) {
    response.min_price = new Decimal(response.min_price).toFixed(8);
  }
  if (response.max_price) {
    response.max_price = new Decimal(response.max_price).toFixed(8);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response)
  };
}

async function handleCircuitStatus(event) {
  const providerId = event.queryStringParameters?.providerId;
  if (!providerId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'providerId required' })
    };
  }

  const response = await new Promise((resolve, reject) => {
    client.getCircuitStatus({ provider_id: providerId }, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response)
  };
}

async function handleRateLimitStatus(event) {
  const providerId = event.queryStringParameters?.providerId;
  if (!providerId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'providerId required' })
    };
  }

  const response = await new Promise((resolve, reject) => {
    client.getRateLimitStatus({ provider_id: providerId }, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });

  // Ensure token counts are properly formatted decimals
  if (response.remaining_tokens) {
    response.remaining_tokens = new Decimal(response.remaining_tokens).toFixed(8);
  }
  if (response.tokens_per_second) {
    response.tokens_per_second = new Decimal(response.tokens_per_second).toFixed(8);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response)
  };
}

async function handleLatencyMetrics(event) {
  const providerId = event.queryStringParameters?.providerId;
  const timeWindow = event.queryStringParameters?.timeWindow || '3600';
  
  if (!providerId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'providerId required' })
    };
  }

  const response = await new Promise((resolve, reject) => {
    client.getLatencyMetrics({
      provider_id: providerId,
      time_window_secs: timeWindow
    }, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response)
  };
}

async function handleProviderStatus(event) {
  const status = JSON.parse(event.body);

  // Ensure price is handled as a proper decimal
  if (status.price) {
    status.price = new Decimal(status.price).toFixed(8);
  }

  const response = await new Promise((resolve, reject) => {
    client.updateProviderStatus(status, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response)
  };
}

// Periodic reconciliation function - should be called on a schedule
async function reconcileBalances() {
  console.log('Starting balance reconciliation');
  
  const results = await dynamodb.scan({
    TableName: process.env.LEDGER_TABLE_NAME,
    ProjectionExpression: 'user_id'
  }).promise();

  for (const user of results.Items) {
    const userId = user.user_id.S;
    
    // Get all user transactions
    const transactions = await getAllUserTransactions(userId);
    
    // Calculate expected balance
    const calculatedBalance = transactions.reduce((acc, tx) => 
      acc.plus(new Decimal(tx.amount.N)), new Decimal('0')
    ).toFixed(8);

    // Get stored balance
    const storedBalance = await getUserBalance(userId);

    // Compare with stored balance
    if (calculatedBalance !== storedBalance) {
      console.error('Balance mismatch detected', {
        userId,
        calculated: calculatedBalance,
        stored: storedBalance,
        difference: new Decimal(calculatedBalance).minus(storedBalance).toFixed(8)
      });

      // Log discrepancy
      await dynamodb.putItem({
        TableName: process.env.AUDIT_LOG_TABLE,
        Item: {
          audit_id: { S: `reconciliation_${Date.now()}` },
          user_id: { S: userId },
          type: { S: 'balance_mismatch' },
          calculated_balance: { N: calculatedBalance },
          stored_balance: { N: storedBalance },
          difference: { N: new Decimal(calculatedBalance).minus(storedBalance).toFixed(8) },
          timestamp: { N: Date.now().toString() }
        }
      });
    }
  }
  
  console.log('Balance reconciliation complete');
}

async function getAllUserTransactions(userId) {
  const transactions = [];
  let lastEvaluatedKey = null;

  do {
    const params = {
      TableName: process.env.LEDGER_TABLE_NAME,
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': { S: userId }
      },
      IndexName: 'user-transactions'
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const response = await dynamodb.query(params);
    transactions.push(...response.Items);
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return transactions;
}
