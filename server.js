const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const schedule = require('node-schedule');

const app = express();
const PORT = process.env.PORT || 5000;
const mongoURI = 'mongodb://localhost:27017/hospitalDB'; // Include the database name in the URI

app.use(bodyParser.json());
app.use(cors());

MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    console.log('MongoDB Connected');
    const db = client.db('hospitalDB');
    const hospitalsCollection = db.collection('hospitals');
    const usersCollection = db.collection('users'); // Reference to the users collection

    // Nodemailer setup
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'vibudeshrb.22cse@kongu.edu',
        pass: 'andx xznk qhsn aagi'
      }
    });

    const sendEmailAlert = (machine, hospital) => {
      const mailOptions = {
        from: 'vibudeshrb.22cse@kongu.edu', // replace with your email
        to: hospital.email, // send to the hospital's email
        subject: 'Machine Maintenance Alert',
        text: `The machine ${machine.type} (${machine.make} - ${machine.model} - ${machine.year}) at ${hospital.name} needs maintenance. It has been in use for more than 3 years.`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
        } else {
          console.log('Email sent:', info.response);
        }
      });
    };

    const checkMachineYears = async () => {
      try {
        console.log('Checking machine years and sending email alerts...');
        const hospitals = await hospitalsCollection.find().toArray();
        const currentYear = new Date().getFullYear();

        hospitals.forEach(hospital => {
          hospital.machines.forEach(machine => {
            if (currentYear - machine.year > 3) {
              sendEmailAlert(machine, hospital);
              console.log('Sending email alert for machine:', machine);
            }
          });
        });
      } catch (error) {
        console.error('Error checking machine years:', error);
      }
    };
    schedule.scheduleJob('0 0 * * *', checkMachineYears);
    //schedule.scheduleJob('*/5 * * * * *', checkMachineYears);

    // Endpoint to add a new hospital
    app.post('/api/hospitals', (req, res) => {
      const { name, location, machines, capacity, specialties, email } = req.body; // include email in the body
      const newHospital = {
        name,
        location,
        capacity,
        specialties,
        machines,
        email // store email in the database
      };

      hospitalsCollection.insertOne(newHospital)
        .then(result => {
          res.json({ _id: result.insertedId, ...newHospital });
        })
        .catch(err => {
          console.error(err);
          res.status(500).json({ error: 'Failed to add hospital' });
        });
    });

    // Endpoint to retrieve all hospitals
    app.get('/api/hospitals', (req, res) => {
      hospitalsCollection.find().toArray()
        .then(results => {
          res.json(results);
        })
        .catch(err => {
          console.error(err);
          res.status(500).json({ error: 'Failed to retrieve hospitals' });
        });
    });

    // Endpoint to handle login
    app.post('/api/login', (req, res) => {
      const { email, password } = req.body;

      usersCollection.findOne({ email, password }) // Simple validation, improve with hashing in production
        .then(user => {
          if (user) {
            res.json({ success: true });
          } else {
            res.status(401).json({ success: false, error: 'Invalid email or password' });
          }
        })
        .catch(err => {
          console.error(err);
          res.status(500).json({ error: 'Failed to perform login' });
        });
    });

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error(err));
