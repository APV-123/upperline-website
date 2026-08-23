# Private Deal document Storage

Confidential Deal documents use the existing private `deal-documents-private` bucket.
An Upperline NextAuth session requests authorization from the server, the server verifies
the Deal and derives a collision-resistant exact object path, and the browser uploads the
bytes through a create-only signed authorization. Only that server-derived path is stored
in the existing Deal document field. Existing service-role signed-read routes and CA gates
remain unchanged.

`deal-documents-private` no longer requires anonymous or authenticated `storage.objects`
INSERT permission. A failed upload never changes the Deal reference. If the subsequent
Deal save fails, the prior database reference remains valid and the new object may remain
orphaned; preserving the authoritative document is preferred to destructive cleanup.

`deal-images` and `deal-documents-public` retain their legacy browser-upload behavior and
remain candidates for future server-authorized upload hardening.
