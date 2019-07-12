var express = require('express');
var speakeasy = require('speakeasy');
var QRCode = require('qrcode');
var nodemailer = require('nodemailer');


const http = require('http');

const hostname = '0.0.0.0';
const port = 3000;

var app = express();
var users =[];

// Root Path
app.get('/', function(req, res) {
   console.log("Server is running. Version: 1.0");
    res.statusCode = 200;
   res.end('Welcome to Compeat MFA - Version 1.0');
});

// MFA Setup
app.get('/mfa_setup', function(req, res) {
    if(!req.query.email) {
        console.log("MFA_SETUP: Email not provided!");
        res.end('<!DOCTYPE html>\
            <html lang="en">\
            <head>\
                <meta charset="UTF-8">\
                <meta name="viewport" content="width=device-width, initial-scale=1.0">\
                <meta http-equiv="X-UA-Compatible" content="ie=edge">\
                <title>Compeat MFA</title>\
            </head>\
            <body>\
                <div class="col-lg-2 col-sm-3 col-xs-6"> Please provide an email!  (http://_ip_:3000/mfa_setup?email=_yourEmail_)</div>\
            </body>\
            </html>');
        return;
    }

    // Create user and generate secret
    var user = {};
    user["email"] = req.query.email;
    user["secret"] = speakeasy.generateSecret({length: 64, name: 'Compeat Portal'});
    users.push(user);
    console.log("MFA_SETUP: Secret: " + user["secret"]);
    console.log("MFA_SETUP: Secret Base32: " + user["secret"].base32); // Save this value to your DB for the user
    console.log("MFA_SETUP: Secret ASCII: " + user["secret"].ascii);

    // Generate QR code and send response
    QRCode.toDataURL(user["secret"].otpauth_url, function (err, image_data) {
        console.log("MFA_SETUP: QRCode DataUrl:" + image_data);
        res.statusCode = 200;
        res.end('<!DOCTYPE html>\
        <html lang="en">\
        <head>\
            <meta charset="UTF-8">\
            <meta name="viewport" content="width=device-width, initial-scale=1.0">\
            <meta http-equiv="X-UA-Compatible" content="ie=edge">\
            <title>Compeat MFA</title>\
        </head>\
        <body>\
            <img src="' + image_data + '" alt="Mountain View">\
            <div class="col-lg-2 col-sm-3 col-xs-6"> MFA Secret: ' + user["secret"].base32 + ' </div>\
        </body>\
        </html>');
    });
});

app.get('/login', function(req, res) {
        if(!req.query.email) {
            console.log("LOGIN: Email not provided!");
            res.end('<!DOCTYPE html>\
            <html lang="en">\
            <head>\
                <meta charset="UTF-8">\
                <meta name="viewport" content="width=device-width, initial-scale=1.0">\
                <meta http-equiv="X-UA-Compatible" content="ie=edge">\
                <title>Compeat MFA</title>\
            </head>\
            <body>\
                <div class="col-lg-2 col-sm-3 col-xs-6"> Please provide an email! (http://_ip_:3000/login?email=_yourEmail_)</div>\
            </body>\
            </html>');
        }
        else {
            if (!req.query.otp) {
                var user_found = false;
                console.log("LOGIN: OTP not provided, but email provided. Generating token...");
                users.forEach(function(user){
                   if (user["email"] ==  req.query.email) {
                       var secret = user["secret"];
                       var token = speakeasy.totp({
                           secret: secret.base32,
                           encoding: 'base32'
                       });
                       console.log("Email: " + req.query.email + ", Token: " + token);

                       // Send Email
                       var transporter = nodemailer.createTransport({
                           host: 'smtp.office365.com', // Office 365 server
                           port: 587,     // secure SMTP
                           secure: false, // false for TLS - as a boolean not string - but the default is false so just remove this completely
                           auth: {
                               user: ''<enter_email>'', //TODO
                               pass: '<enter_password>' //TODO
                           },
                           tls: {
                               ciphers: 'SSLv3'
                           },
                           requireTLS: true
                       });

                       var mailOptions = {
                           from: 'venkat.subramanian@compeat.com',
                           to: user["email"],
                           subject: 'Your OTP for Compeat Portal',
                           text: 'OTP: ' + token
                       };

                       transporter.sendMail(mailOptions, function(error, info){
                           if (error) {
                               console.log(error);
                           } else {
                               console.log('LOGIN: Email sent: ' + info.response);
                           }
                       });

                       res.end('<!DOCTYPE html>\
                       <html lang="en">\
                       <head>\
                       <meta charset="UTF-8">\
                       <meta name="viewport" content="width=device-width, initial-scale=1.0">\
                       <meta http-equiv="X-UA-Compatible" content="ie=edge">\
                       <title>Compeat MFA</title>\
                       </head>\
                       <body>\
                            <div class="col-lg-2 col-sm-3 col-xs-6"> Your token has been sent to '+ req.query.email +'. To enter OTP. please use http://_ip_:3000/login?email=_yourEmail_&otp=_yourOTP_</div>\
                       </body>\
                       </html>');
                       user_found = true;
                   }
                });

                if (!user_found) {
                    console.log("LOGIN: User not found. User has to perform MFA Setup.");

                    res.end('<!DOCTYPE html>\
                       <html lang="en">\
                       <head>\
                       <meta charset="UTF-8">\
                       <meta name="viewport" content="width=device-width, initial-scale=1.0">\
                       <meta http-equiv="X-UA-Compatible" content="ie=edge">\
                       <title>Compeat MFA</title>\
                       </head>\
                       <body>\
                            <div class="col-lg-2 col-sm-3 col-xs-6"> I cannot find you using your email. Please complete MFA Setup (http://_ip_:3000/mfa_setup?email=_yourEmail_).</div>\
                       </body>\
                       </html>');
                }
            }
            else {

                user_found = false;
                users.forEach(function(user) {
                    if (user["email"] == req.query.email) {
                        user_found = true;
                        var secret = user["secret"];

                        console.log("LOGIN: OTP: " + req.query.otp);
                        console.log('LOGIN: Secret Base32: ' + secret);
                        var verified = speakeasy.totp.verify({
                            secret: secret.base32,
                            encoding: 'base32',
                            token: req.query.otp,
                            window: 2
                        });

                        if (verified) {
                            console.log('Successfully authenticated!');
                            //res.end('Successfully Authenticated via Compeat MFA!');
                            res.end('<!DOCTYPE html>\
                            <html lang="en">\
                            <head>\
                                <meta charset="UTF-8">\
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">\
                                <meta http-equiv="X-UA-Compatible" content="ie=edge">\
                                <title>Compeat MFA</title>\
                            </head>\
                            <body>\
                                <div class="col-lg-2 col-sm-3 col-xs-6"> Successfully Authenticated via Compeat MFA! </div>\
                            </body>\
                            </html>');
                        } else {
                            console.log('Authentication Failure!');
                            //res.send('Authentication Failure! \nRetry login with a new OTP. If issue persists, try MFA set up again.');
                            res.end('<!DOCTYPE html>\
                            <html lang="en">\
                            <head>\
                                <meta charset="UTF-8">\
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">\
                                <meta http-equiv="X-UA-Compatible" content="ie=edge">\
                                <title>Compeat MFA</title>\
                            </head>\
                            <body>\
                                <div class="col-lg-2 col-sm-3 col-xs-6"> Authentication Failure! \nRetry login with a new OTP. If issue persists, try MFA set up again. </div>\
                            </body>\
                            </html>');
                        }
                        return;
                    }
                });
                if (!user_found) {
                    console.log("LOGIN: User not found. User has to perform MFA Setup.");

                    res.end('<!DOCTYPE html>\
                       <html lang="en">\
                       <head>\
                       <meta charset="UTF-8">\
                       <meta name="viewport" content="width=device-width, initial-scale=1.0">\
                       <meta http-equiv="X-UA-Compatible" content="ie=edge">\
                       <title>Compeat MFA</title>\
                       </head>\
                       <body>\
                            <div class="col-lg-2 col-sm-3 col-xs-6"> I cannot find you using your email. Please complete MFA Setup (http://_ip_:3000/mfa_setup?email=_yourEmail_).</div>\
                       </body>\
                       </html>');
                }
        }
    }
});

app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});