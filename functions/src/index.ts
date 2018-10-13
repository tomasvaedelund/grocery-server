import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();

import * as express from 'express';
import * as cors from 'cors';

import { IGroup, IMembership, IUserGroupsResponse } from './models';

/* *************
  DB Triggers
************** */

// Listen for creation of a new group on collection `groups`
exports.onCreateGroup = functions.firestore
  .document('groups/{groupId}')
  .onCreate((snap, context) => {
    const newGroup = snap.data() as IGroup;
    const userId = newGroup.createdBy;
    const groupId = snap.id;

    const newMembership: IMembership = {
      userId,
      groupId,
      joinedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    return admin
      .firestore()
      .collection(`memberships`)
      .doc(`${userId}_${groupId}`)
      .set(newMembership);
  });

/* *************
  HTTP Endpoints
************** */

// Could need som authentication?
// https://github.com/firebase/functions-samples/blob/master/authorized-https-endpoint/functions/index.js

// Inspiration
// https://codeburst.io/express-js-on-cloud-functions-for-firebase-86ed26f9144c

// All http endpoints

// GET - All groups for specified user
const userGroups = express();
userGroups.use(cors({ origin: true }));
userGroups.get('/:userId', (request, response) => {
  const userId = request.params.userId;

  admin
    .firestore()
    // First get all groups for specified user
    .collection(`memberships`)
    .where('userId', '==', userId)
    .get()
    // Then iterate each groupId and then get details for each group
    .then(membershipsSnap => {
      const promises = [];
      membershipsSnap.forEach(membershipSnap => {
        const membership = membershipSnap.data() as IMembership;
        const promise = admin
          .firestore()
          .doc(`groups/${membership.groupId}`)
          .get();
        promises.push(promise);
      });

      return Promise.all(promises);
    })
    // Then collect the groups and join them to a returnable value
    .then(groupsSnap => {
      const groups = [];
      groupsSnap.forEach(groupSnap => {
        const group = groupSnap.data() as IGroup;
        groups.push(group);
      });

      const userGroupsResponse: IUserGroupsResponse = {
        groups
      };

      response.send(userGroupsResponse);
    })
    .catch(err => {
      response.status(500).send({ error: err });
    });
});

export const getUserGroups = functions.https.onRequest((request, response) => {
  return userGroups(request, response);
});
