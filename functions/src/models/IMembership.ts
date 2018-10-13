export interface IMembership {
  userId: string;
  groupId: string;
  joinedAt: FirebaseFirestore.FieldValue;
}
