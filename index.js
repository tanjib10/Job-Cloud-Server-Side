const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yfphnhu.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

  
async function run() {
  try {
    await client.connect();

  const brandCollection = client.db('job-cloud').collection('job-categories');
    const bidCollection = client.db('job-cloud').collection('bids');
     const newJobCollection = client.db('job-cloud').collection('new-jobs')

       app.get('/job', async (req, res) => {
      const cursor = brandCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
       app.get('/job/add', async (req, res) => {
      const cursor = newJobCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

  app.get('/job/:category', async (req,res) => {
     const category = req.params.category;
     const query = {category:category}
     const items = await brandCollection.find(query).toArray();
     res.send(items)
    })


    app.get('/job/details/:id', async (req, res) => {
      const jobId = req.params.id;
      const job = await brandCollection.findOne({ _id: new ObjectId(jobId) });
      res.json(job);
    });
    app.get('/job/new/details/:id', async (req, res) => {
      const jobId = req.params.id;
      const job = await newJobCollection.findOne({ _id: new ObjectId(jobId) });
      res.json(job);
    });


    app.get('/bids/:email', async (req, res) => {
  try {
    const userEmail = req.params.email;
    const bids = await bidCollection.find({ bidderEmail: userEmail }).toArray();
    res.json(bids);
  } catch (error) {
    ('Error fetching bids:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/bid-requests/:ownerEmail', async (req, res) => {
  try {
    const ownerEmail = req.params.ownerEmail;
    const bidRequests = await bidCollection.find({ ownerEmail }).toArray();
    res.json(bidRequests);
  } catch (error) {
    ('Error fetching bid requests:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


    app.post('/bid/:id', async (req, res) => {
      const jobId = req.params.id;
      const { price, deadline, bidderEmail } = req.body;

      const job = await brandCollection.findOne({ _id: new ObjectId(jobId) });
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      if (job.ownerEmail === bidderEmail) {
        return res.status(400).json({ error: 'Cannot bid on your own job' });
      }
      const bid = {
        price,
        deadline,
        bidderEmail,
        jobId: new ObjectId(jobId),
      };
      await bidCollection.insertOne(bid);
      res.json({ message: 'Bid placed successfully' });
    });


app.post('/job/add', async (req, res) => {
  try {
        ('Received request to add a job');
    const { ownerEmail, jobTitle, deadline, description, category, minPrice, maxPrice } = req.body;

    if (!ownerEmail || !jobTitle || !deadline || !category || !minPrice || !maxPrice) {
      return res.status(400).json({ error: 'Incomplete job information provided' });
    }

    const newJob = {
      ownerEmail,
      jobTitle,
      deadline,
      description,
      category,
      minPrice,
      maxPrice,
    };

    const result = await newJobCollection.insertOne(newJob);

    if (result.insertedCount === 1) {
          ('Job added successfully');
      res.status(201).json({ message: 'Job added successfully' });
    } else {
      res.status(500).json({ error: 'Failed to add job' });
    }
  } catch (error) {
  }
});


app.put('/bid-requests/accept/:id', async (req, res) => {
  try {
    const bidId = req.params.id;
    await bidCollection.updateOne({ _id: new ObjectId(bidId) }, { $set: { status: 'in progress' } });

    res.status(200).json({ message: 'Bid accepted successfully' });
  } catch (error) {
    ('Error accepting bid:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/bid-requests/reject/:id', async (req, res) => {
  try {
    const bidId = req.params.id;
    await bidCollection.updateOne({ _id: new ObjectId(bidId) }, { $set: { status: 'rejected' } });

    res.status(200).json({ message: 'Bid rejected successfully' });
  } catch (error) {
    ('Error rejecting bid:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.put('/job/update/:id', async (req, res) => {
  try {
    const jobId = req.params.id;
    const { jobTitle, deadline, description, category, minPrice, maxPrice } = req.body;
    if (!jobTitle || !deadline || !description || !category || !minPrice || !maxPrice) {
      return res.status(400).json({ error: 'Incomplete job information provided' });
    }
    const updatedJob = {
      jobTitle,
      deadline,
      description,
      category,
      minPrice,
      maxPrice,
    };
    const result = await newJobCollection.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: updatedJob }
    );
    if (result.modifiedCount === 1) {
      ('Job updated successfully');
      res.status(200).json({ message: 'Job updated successfully' });
    } else {
      res.status(404).json({ error: 'Job not found or no changes were made' });
    }
  } catch (error) {
    ('Error updating job:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/bid/update/:id', async (req, res) => {
  try {
    const bidId = req.params.id;
    const { status } = req.body;

    const result = await bidCollection.updateOne(
      { _id: new ObjectId(bidId) },
      { $set: { status } }
    );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: 'Bid status updated successfully' });
    } else {
      res.status(404).json({ error: 'Bid not found or no changes were made' });
    }
  } catch (error) {
    ('Error updating bid status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.put('/bid/complete/:id', async (req, res) => {
  try {
    const bidId = req.params.id;

    const result = await bidCollection.updateOne(
      { _id: new ObjectId(bidId) },
      { $set: { status: 'complete' } }
    );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: 'Bid completed successfully' });
    } else {
      res.status(404).json({ error: 'Bid not found or no changes were made' });
    }
  } catch (error) {
    ('Error completing bid:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});





app.delete('/job/delete/:id', async (req, res) => {
  try {
    const jobId = req.params.id;

    const result = await newJobCollection.deleteOne({ _id: new ObjectId(jobId) });

    if (result.deletedCount === 1) {
      ('Job deleted successfully');
      res.status(200).json({ message: 'Job deleted successfully' });
    } else {
      res.status(404).json({ error: 'Job not found' });
    }
  } catch (error) {
    ('Error deleting job:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    ('Pinged your deployment. You successfully connected to MongoDB!');
  } finally {
    // await client.close();
  }
}

run().catch();

app.get('/', (req, res) => {
  res.send('server is running');
});

app.listen(port, () => {
  ('server is running');
});
