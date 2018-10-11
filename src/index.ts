import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { environment } from './environments/environment';
admin.initializeApp(environment.firebase);

import { IFamily } from './models/IFamily';

// Listen for any change on collection `families`
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
