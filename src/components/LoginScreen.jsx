import React from "react";

export function LoginScreen({ login, setLogin, err, onSubmit, onLocalMode, showLocalOption = true }) {
  return (
    <div className="screen screen-login">
      <h1 className="app-title">Table Mate Accounting</h1>
      <p className="app-subtitle">Track team expenses — see spend per person or for the whole team.</p>
      {err && <div className="msg err">{err}</div>}
      <form onSubmit={onSubmit} className="form form-login">
        <input
          type="email"
          placeholder="Email"
          value={login.email}
          onChange={(e) => setLogin((p) => ({ ...p, email: e.target.value }))}
        />
        <input
          type="password"
          placeholder="Password"
          value={login.password}
          onChange={(e) => setLogin((p) => ({ ...p, password: e.target.value }))}
        />
        <button type="submit">Sign in</button>
      </form>
      {showLocalOption && (
        <>
          <div className="login-divider">or</div>
          <button type="button" className="btn-secondary" onClick={onLocalMode}>
            Use without account (local data)
          </button>
        </>
      )}
    </div>
  );
}
