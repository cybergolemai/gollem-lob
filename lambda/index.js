// lambda/index.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

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

async function handleGenerate(event) {
  const { model, prompt } = JSON.parse(event.body);
  
  const bid = {
    model: model,
    prompt: prompt,
    maxPrice: event.headers['x-max-price'] || '0.001',
    maxLatency: parseInt(event.headers['x-max-latency'] || '1000'),
    timestamp: Date.now().toString()
  };

  const response = await new Promise((resolve, reject) => {
    client.submitBid({ bid }, (error, response) => {
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

async function handleOrderBookStatus(event) {
  const model = event.queryStringParameters?.model;

  const response = await new Promise((resolve, reject) => {
    client.getOrderBookStatus({ model }, (error, response) => {
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