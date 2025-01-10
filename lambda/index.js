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
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(response)
  };
};
