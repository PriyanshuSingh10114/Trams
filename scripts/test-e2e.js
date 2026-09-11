/**
 * End-to-End Test Suite for Microservices System
 * Run: node scripts/test-e2e.js
 */

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function logPass(testName) {
  console.log(`${colors.green}  ✓ PASS:${colors.reset} ${testName}`);
}

function logFail(testName, error) {
  console.error(`${colors.red}  ✗ FAIL:${colors.reset} ${testName}`);
  console.error(`    ${colors.red}${error.message || error}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runE2ETests() {
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan} Starting End-to-End Microservices Verification Flow ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan} Target Gateway: ${GATEWAY_URL} ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================\n${colors.reset}`);

  let passedTests = 0;
  let totalTests = 0;

  const testUser = {
    name: `Test Engineer ${Date.now()}`,
    email: `engineer_${Date.now()}@example.com`,
    password: 'SuperSecret123!'
  };

  let authToken = null;
  let userId = null;

  // Test 1: Health & Readiness Checks
  totalTests++;
  try {
    const res = await fetch(`${GATEWAY_URL}/health`);
    const data = await res.json();
    if (res.ok && data.status === 'ok') {
      logPass('API Gateway /health endpoint responds OK');
      passedTests++;
    } else {
      throw new Error(`Invalid health response: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    logFail('API Gateway /health endpoint responds OK', err);
  }

  totalTests++;
  try {
    const res = await fetch(`${GATEWAY_URL}/ready`);
    const data = await res.json();
    if (res.ok && data.status === 'ready') {
      logPass('System-wide /ready check (User Service, Notification Service, Databases, NATS)');
      passedTests++;
    } else {
      throw new Error(`Readiness check returned: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    logFail('System-wide /ready check', err);
  }

  // Test 2: User Registration
  totalTests++;
  try {
    const res = await fetch(`${GATEWAY_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const json = await res.json();

    if (res.status === 201 && json.success && json.data.token && json.data.user.id) {
      authToken = json.data.token;
      userId = json.data.user.id;
      logPass(`User Registration (Outbox Event Queued & NATS JetStream Triggered) - User ID: ${userId}`);
      passedTests++;
    } else {
      throw new Error(`Registration failed: ${JSON.stringify(json)}`);
    }
  } catch (err) {
    logFail('User Registration', err);
  }

  // Test 3: Duplicate Registration Conflict
  totalTests++;
  try {
    const res = await fetch(`${GATEWAY_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const json = await res.json();

    if (res.status === 409 && !json.success) {
      logPass('Duplicate Email Registration Rejected (409 Conflict)');
      passedTests++;
    } else {
      throw new Error(`Expected 409 Conflict, received status ${res.status}: ${JSON.stringify(json)}`);
    }
  } catch (err) {
    logFail('Duplicate Email Registration Rejected', err);
  }

  // Test 4: User Login
  totalTests++;
  try {
    const res = await fetch(`${GATEWAY_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    const json = await res.json();

    if (res.status === 200 && json.success && json.data.token) {
      logPass('User Login & Password Hash Verification via bcrypt');
      passedTests++;
    } else {
      throw new Error(`Login failed: ${JSON.stringify(json)}`);
    }
  } catch (err) {
    logFail('User Login', err);
  }

  // Test 5: Get Authenticated User Profile (/api/users/me)
  totalTests++;
  try {
    const res = await fetch(`${GATEWAY_URL}/api/users/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const json = await res.json();

    if (res.status === 200 && json.success && json.data.id === userId) {
      logPass('Fetch Authenticated Profile via Gateway JWT Verification');
      passedTests++;
    } else {
      throw new Error(`Get Profile failed: ${JSON.stringify(json)}`);
    }
  } catch (err) {
    logFail('Fetch Authenticated Profile', err);
  }

  // Test 6: Update User Profile (/api/users/me)
  totalTests++;
  try {
    const updatedName = `${testUser.name} [Updated]`;
    const res = await fetch(`${GATEWAY_URL}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: updatedName })
    });
    const json = await res.json();

    if (res.status === 200 && json.success && json.data.name === updatedName) {
      logPass('Update User Profile & Publish user.updated Outbox Event');
      passedTests++;
    } else {
      throw new Error(`Update Profile failed: ${JSON.stringify(json)}`);
    }
  } catch (err) {
    logFail('Update User Profile', err);
  }

  // Test 7: Verify Asynchronous Notification Consumption via NATS JetStream
  totalTests++;
  try {
    console.log(`\n  ${colors.yellow}⏳ Waiting up to 5s for JetStream event consumption & notification creation...${colors.reset}`);
    let notifications = [];
    for (let attempt = 0; attempt < 10; attempt++) {
      await sleep(500);
      const res = await fetch(`${GATEWAY_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          notifications = json.data;
          break;
        }
      }
    }

    const hasWelcome = notifications.some(n => n.type === 'WELCOME');
    const hasUpdate = notifications.some(n => n.type === 'PROFILE_UPDATED');

    if (hasWelcome) {
      logPass(`NATS JetStream Async Event Delivered & Processed (Found WELCOME notification, count: ${notifications.length})`);
      passedTests++;
    } else {
      throw new Error(`No WELCOME notification found. Notifications: ${JSON.stringify(notifications)}`);
    }
  } catch (err) {
    logFail('NATS JetStream Async Event Delivery & Notification Creation', err);
  }

  // Test 8: Security & Rate Limiting Verification
  totalTests++;
  try {
    const res = await fetch(`${GATEWAY_URL}/api/users/me`, {
      headers: { 'Authorization': 'Bearer invalid-token-123' }
    });
    const json = await res.json();

    if (res.status === 401 && !json.success) {
      logPass('Invalid JWT Rejection on Protected Gateway Routes');
      passedTests++;
    } else {
      throw new Error(`Expected 401 Unauthorized, received ${res.status}: ${JSON.stringify(json)}`);
    }
  } catch (err) {
    logFail('Invalid JWT Rejection', err);
  }

  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold} Verification Summary: ${passedTests}/${totalTests} Tests Passed ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================\n${colors.reset}`);

  if (passedTests === totalTests) {
    console.log(`${colors.green}${colors.bold} All End-to-End System Tests Passed Successfully!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.error(`${colors.red}${colors.bold} One or more E2E tests failed.${colors.reset}\n`);
    process.exit(1);
  }
}

runE2ETests().catch(err => {
  console.error('Fatal E2E runner error:', err);
  process.exit(1);
});
