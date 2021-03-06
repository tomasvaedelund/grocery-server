import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();

// import * as express from 'express';
// import * as cors from 'cors';

import { IGroup, IMembership } from './models';

/* *************
  DB Triggers
************** */

// Listen for creation of a new group
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

// Listen for deletion of a group and then delete belonging memberships
exports.onDeleteGroup = functions.firestore
  .document('groups/{groupId}')
  .onDelete(async (snap, context) => {
    const deletedGroupId = snap.id;
    const affectedMemberships = admin
      .firestore()
      .collection('memberships')
      .where('groupId', '==', deletedGroupId);

    const batch = admin.firestore().batch();

    await affectedMemberships.get().then(membershipsSnap => {
      membershipsSnap.forEach(membershipSnap => {
        const membershipRef = admin
          .firestore()
          .collection('memberships')
          .doc(membershipSnap.id);

        batch.delete(membershipRef);
      });
    });

    return batch.commit();
  });

// Listen for deletion of a membership and if it's the last then also delete the group
exports.onDeleteMembership = functions.firestore
  .document('memberships/{pushId}')
  .onDelete(async (snap, context) => {
    const deletedGroupId = snap.data().groupId;
    const test = admin
      .firestore()
      .collection('memberships')
      .where('groupId', '==', deletedGroupId);

    const memberships = await test.get().then(membershipsSnap => {
      return membershipsSnap.docs.length;
    });

    if (memberships === 0) {
      return admin
        .firestore()
        .doc(`/groups/${deletedGroupId}`)
        .delete();
    }

    return null;
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
// const userGroups = express();
// userGroups.use(cors({ origin: true }));
// userGroups.get('/:userId', (request, response) => {
//   const userId = request.params.userId;

//   admin
//     .firestore()
//     // First get all groups for specified user
//     .collection(`memberships`)
//     .where('userId', '==', userId)
//     .get()
//     // Then iterate each groupId and then get details for each group
//     .then(membershipsSnap => {
//       const promises = [];
//       membershipsSnap.forEach(membershipSnap => {
//         const membership = membershipSnap.data() as IMembership;
//         const promise = admin
//           .firestore()
//           .doc(`groups/${membership.groupId}`)
//           .get();
//         promises.push(promise);
//       });

//       return Promise.all(promises);
//     })
//     // Then collect the groups and join them to a returnable value
//     .then(groupsSnap => {
//       const groups: IGroup[] = [];
//       groupsSnap.forEach(groupSnap => {
//         const group = groupSnap.data() as IGroup;
//         groups.push(group);
//       });

//       const userGroupsResponse: IUserGroupsResponse = {
//         groups
//       };

//       response.send(userGroupsResponse);
//     })
//     .catch(err => {
//       response.status(500).send({ error: err });
//     });
// });

// export const getUserGroups = functions.https.onRequest((request, response) => {
//   return userGroups(request, response);
// });
