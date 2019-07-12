# nodejs-mfa
============================
MFA implementation in NodeJS
============================

Features
=========
1. TOTP Client based MFA (Google Authenticator, Duo Security, Authy, etc.)
2. Email based MFA (TOTP-based token/OTP will be sent to provided email)
3. QR Code generation along with MFA secret, for initial setup of TOTP client

Prerequisites
=============
1. Download source from this repo
2. Install node (source has been tested with node 10.16.0)
3. Install npm, if not already installed (tested with npm version 6.9.0)
4. npm install --save speakeasy (speakeasy is a nodejs library for MFA)
5. npm install --save qrcode    (nodejs library for QR code generation)
6. npm install express (nodejs web application framework)

Execution
=========
1. Look for "auth:" section in app.js (line 104 **could be outdated**). Provide the email address and password for the email account to be used for sending emails. 
2. Run app.js

Workflows
=========
1.  http://<ip>:3000/mfa_setup?email=<yourEmail>  - MFA Setup for User (Both TOTP Clients and Email users)
2.a For TOTP Clients:  Scan barcode / input MFA secret within TOTP client such as Google Authenticator for endpoint setup within TOTP client
2.b For Email: http://<ip>:3000/login?email=<yourEmail>  - The OTP/Token will be sent to this email now
3.  http://<ip>:3000/login?email=<yourEmail>&otp=<generatedOTP>  - Login using the email and OTP generated via TOTP client or  recevied in Email.
