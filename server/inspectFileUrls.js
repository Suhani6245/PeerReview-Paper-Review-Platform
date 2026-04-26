require('dotenv').config();
const mongoose = require('mongoose');
const Paper = require('./models/Paper');
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const papers = await Paper.find().limit(20).select('title fileUrl fileName').lean();
    console.log(JSON.stringify(papers, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
})();
