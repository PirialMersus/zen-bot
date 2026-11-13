import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is missing');

  const isProd = process.env.NODE_ENV === 'production';

  await mongoose.connect(
    uri,
    isProd ? {} : { dbName: 'zen-bot-dev' }
  );
  console.log('Mongo connected');
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
};
