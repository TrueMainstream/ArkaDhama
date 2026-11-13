export function loginHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in · Arka Dhama</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #fbf7f0;
    color: #241f16;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    line-height: 1.5;
  }
  main {
    max-width: 560px;
    margin: 0 auto;
    padding: 48px 20px 64px;
  }
  a { color: #8c6a2f; }
  .back {
    display: inline-block;
    margin-bottom: 20px;
    font-size: 15px;
  }
  h1 {
    margin: 0 0 20px;
    font-size: 28px;
    line-height: 1.2;
  }
  .panel {
    background: #ffffff;
    border: 1px solid #e4dccb;
    border-radius: 10px;
    padding: 24px;
  }
  .row {
    display: flex;
    gap: 12px;
  }
  .field {
    flex: 1;
    min-width: 0;
    margin-bottom: 16px;
  }
  label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
  }
  input {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    border: 1px solid #e4dccb;
    border-radius: 8px;
    background: #ffffff;
    color: #241f16;
    font: inherit;
  }
  button {
    min-height: 44px;
    padding: 10px 20px;
    border: 1px solid #8c6a2f;
    border-radius: 8px;
    background: #8c6a2f;
    color: #ffffff;
    font: inherit;
    font-size: 16px;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .msg {
    margin: 12px 0 0;
    color: #a33a2a;
    font-size: 14px;
  }
  .swap {
    margin: 18px 0 0;
    font-size: 15px;
  }
  .note {
    margin: 8px 0 0;
    color: #6f675b;
    font-size: 14px;
  }
  @media (max-width: 640px) {
    main { padding: 32px 16px 48px; }
    .row { flex-direction: column; gap: 0; }
    .field { width: 100%; }
    button { width: 100%; }
  }
</style>
</head>
<body>
<main>
  <a class="back" href="/">Back</a>
  <h1 id="heading">Sign in</h1>

  <section class="panel" id="signin-panel">
    <form id="signin-form">
      <div class="row">
        <div class="field">
          <label for="signin-username">Username</label>
          <input id="signin-username" name="username" autocomplete="username" required>
        </div>
        <div class="field">
          <label for="signin-password">Password</label>
          <input id="signin-password" name="password" type="password" autocomplete="current-password" required>
        </div>
      </div>
      <button type="submit" id="signin-button">Sign in</button>
      <p class="msg" id="signin-msg"></p>
    </form>
    <p class="swap"><a href="#" id="to-register">Create an account</a></p>
    <p class="note">Anyone can register, and only an admin can make that account staff or admin.</p>
  </section>

  <section class="panel" id="register-panel" hidden>
    <form id="register-form">
      <div class="row">
        <div class="field">
          <label for="register-username">Username</label>
          <input id="register-username" name="username" autocomplete="username" required>
        </div>
        <div class="field">
          <label for="register-email">Email</label>
          <input id="register-email" name="email" type="email" autocomplete="email" required>
        </div>
      </div>
      <div class="field">
        <label for="register-password">Password</label>
        <input id="register-password" name="password" type="password" autocomplete="new-password" required>
      </div>
      <button type="submit" id="register-button">Create account</button>
      <p class="msg" id="register-msg"></p>
    </form>
    <p class="swap"><a href="#" id="to-signin">Sign in instead</a></p>
  </section>
</main>
<script>
(function () {
  "use strict";

  var heading = document.getElementById("heading");
  var signinPanel = document.getElementById("signin-panel");
  var registerPanel = document.getElementById("register-panel");
  var signinMsg = document.getElementById("signin-msg");
  var registerMsg = document.getElementById("register-msg");

  function swap(toRegister) {
    signinPanel.hidden = toRegister;
    registerPanel.hidden = !toRegister;
    heading.textContent = toRegister ? "Register" : "Sign in";
    signinMsg.textContent = "";
    registerMsg.textContent = "";
  }

  document.getElementById("to-register").addEventListener("click", function (event) {
    event.preventDefault();
    swap(true);
  });

  document.getElementById("to-signin").addEventListener("click", function (event) {
    event.preventDefault();
    swap(false);
  });

  function homeFor(role) {
    if (role === "admin") return "/admin";
    if (role === "staff") return "/staff";
    return "/";
  }

  function post(event, url, fieldIds, button, msg) {
    event.preventDefault();
    var payload = {};
    for (var i = 0; i < fieldIds.length; i++) {
      var field = document.getElementById(fieldIds[i]);
      payload[field.name] = field.value;
    }
    msg.textContent = "";
    button.disabled = true;
    fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json().then(
        function (data) { return data; },
        function () { return null; }
      );
    }).then(function (data) {
      if (data && data.ok && data.account) {
        window.location.assign(homeFor(data.account.role));
        return;
      }
      button.disabled = false;
      msg.textContent = data && data.error ? data.error : "Could not reach the server. Try again.";
    }).catch(function () {
      button.disabled = false;
      msg.textContent = "Could not reach the server. Try again.";
    });
  }

  document.getElementById("signin-form").addEventListener("submit", function (event) {
    post(event, "/api/login", ["signin-username", "signin-password"],
      document.getElementById("signin-button"), signinMsg);
  });

  document.getElementById("register-form").addEventListener("submit", function (event) {
    post(event, "/api/register", ["register-username", "register-email", "register-password"],
      document.getElementById("register-button"), registerMsg);
  });
})();
</script>
</body>
</html>
`;
}
