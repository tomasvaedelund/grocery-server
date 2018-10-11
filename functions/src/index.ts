import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();

import * as express from 'express';
import * as cors from 'cors';

import { IFamily } from './models/IFamily';
import { IUserFamily } from './models/IUserFamily';

/* *************
  DB Triggers
************** */

// Listen for creation of a new family on collection `families`
exports.onCreateFamily = functions.firestore
  .document('families/{familyId}')
  .onCreate((snap, context) => {
    const newFamily = snap.data() as IFamily;
    const uid = newFamily.createdBy;

    return admin
      .firestore()
      .collection(`users/${uid}/families`)
      .add({ familyId: snap.id });
  });

/* *************
  HTTP Endpoints
************** */

// Could need som authentication?
// https://github.com/firebase/functions-samples/blob/master/authorized-https-endpoint/functions/index.js

// Inspiration
// https://codeburst.io/express-js-on-cloud-functions-for-firebase-86ed26f9144c

// All http endpoints

// GET - All families for specified user
const userFamilies = express();
userFamilies.use(cors({ origin: true }));
userFamilies.get('/:userId', (request, response) => {
  const userId = request.params.userId;

  admin
    .firestore()
    // First get all families for specified user
    .collection(`users/${userId}/families`)
    .get()
    // Then iterate each familyId and then get each family
    .then(userFamilySnaps => {
      const promises = [];
      userFamilySnaps.forEach(userFamilySnap => {
        const userFamily = userFamilySnap.data() as IUserFamily;
        const promise = admin
          .firestore()
          .doc(`families/${userFamily.familyId}`)
          .get();
        promises.push(promise);
      });

      return Promise.all(promises);
    })
    // Then collect the families and join them to a reternatble value
    .then(familySnaps => {
      const result = [];
      familySnaps.forEach(familySnap => {
        const family = familySnap.data() as IFamily;
        result.push(family);
      });

      response.send({ families: result });
    })
    .catch(err => {
      response.status(500).send({ error: err });
    });
});

export const getUserFamilies = functions.https.onRequest(
  (request, response) => {
    return userFamilies(request, response);
  }
);
