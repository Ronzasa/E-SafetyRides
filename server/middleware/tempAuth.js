// TEMPORARY — replace with real auth middleware once Member 4's Auth module is ready.
// Fakes a logged-in user. Pass ?testUser=someId in the URL to simulate a different user for testing.
function tempAuth(req, res, next) {
  const testUserId = req.query.testUser || 'dev-user-1';
  req.user = { uid: testUserId };
  next();
}

export default tempAuth;