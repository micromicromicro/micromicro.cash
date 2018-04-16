<!-- Accept Donations on Your Website -->

Receiving donations is simple with micromicro - you don't need a dedicated server, a database, or anything other than a static HTML host.

## 1. Create an account

If you haven't already, [create an account and add some money](getting_started.html?{bust}) to cover account maintenance

## 2. Create an In

On the web app home screen, press "New (In)".

![New (In)](case_donations_new_in.jpg)

## 3. Fill out the form

Let's make a few changes from the defaults.

* Select "Slow" - donations will take longer to arrive but the transaction fee is lower.

* You should add a message to "Personal Memo" to remind you what the money is for when you receive a donation.

* Also add a "Display Message" with a similar reminder so the donator doesn't have to come up with a note themselves.

* Press the <img alt="The minus" class="inline" src="/app/minus.svg"> next to "One-time" so you can reuse the address you're creating.

![New (In) filled form](case_donations_new_in_form.jpg)

Press "Receive".

## 4. Download the QR code image

![Download the QR code](case_donations_download_qr_code.jpg)

Save the file as `donation_qr.svg`.

## 5. Copy the QR code URL

## 6. Upload the QR code and update your HTML

Upload `donation_qrq.svg` and add the following to your HTML:

```
<a target="_blank" href="URL"><img src="donation_qr.svg" alt="Donate!"></a>
```

Replace `URL` with the URL we copied in step 5.

You're done!  Visitors can scan or click the QR code link to donate to your project: