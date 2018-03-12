<!-- Create a Digital Asset Store -->

One thing micromicro makes easy is creating a low-overhead store for digital assets like music or video.  The process is somewhat involved but you have complete flexibility with the end result.

This guide shows how to set up your store with AWS, but Azure and Google Cloud have similar tools you should be able to use as well, and failing that everything here can also be done easily with PHP webhost.

### Overview

The store will be fairly simple, with four components:

* An Amazon S3 bucket will store the digital assets
* A second bucket will host the webpage itself
* An Amazon Lambda function will create a payment address when the user selects an asset
* A second Lambda function will send a temporary download link to their email when the purchase is completed

Before we start you'll need to prepare several things:

1. An AWS account

1. An email account for sending download links. You can probably try this with a personal email account, but if you expect lots of purchases daily you may wish to set up Amazon SES or something similar.

1. A micromicro account with a small balance to cover account maintenance and address creation.

### 1. Prepare the source code

All the files required for project have been prepared in the [example-asset-store](https://github.com/micromicromicro/example-asset-store) repository.

You'll need `7z`, `node` and `npm` installed to assemble the pieces.

1. Run `git clone https://github.com/micromicromicro/example-asset-store` and enter the repository directory

1. Run `npm install` to download all the Javascript dependencies

1. Run `./build.sh` to package all the functions and Javascript.

### 2. Upload the assets

We'll store the assets in Amazon's S3 storage service.  The files will be private, but when someone purchases one we'll create a special link that allows the clicker to download it for a period of time.

1. Log into the AWS console website, click on the "Services" dropdown and select "S3" under "Storage".

![Services dropdown](case_asset_store_services_dropdown.jpg)

![S3 link](case_asset_store_s3_link.jpg)

1. Click "Create Bucket" and enter a name for your asset bucket.  We'll use `mmex-my-assets`.  The default settings are okay, so press "Create" in the bottom left.

1. Open the bucket and press "Upload", select the two assets from `assets/` in the repository and press `Upload` in the bottom left.

The bucket should look like this when done:

![Completed asset bucket](case_asset_store_asset_bucket.jpg)

### 3. Create a Lambda function to generate payment addresses

When someone wants to buy an asset we create a payment address they can use to purchase it.  The provided website code makes a call to an API to create the address, so first we need to make that API.

We'll use AWS Lambda for this.  Lambda is a service that will run a program for you when a URL is accessed, and you're only charged when it runs (and only for a small amount, and only after the first N free requests per month).

1. Click the "Services" dropdown again and select "Lambda" under "Compute".

1. Click "Create a function".

1. Enter `create_address` for the "Name"

    ![Function initial settings](case_asset_store_function_initial_settings.jpg)

1. Select "Python 3.6" for the "Runtime"

1. Select "Create new role from template(s)" for the "Role".  Name the role `basic_lambda_role` - this function doesn't interact with any AWS services so it doesn't need any permissions in particular.

1. Choose "Basic Edge Lambda permissions" for the "Policy Template"

1. Press "Create function"

1. In the "Designer" box under "Add triggers" click "API Gateway".  API Gateway is the mechanism for triggering the Lambda function when a HTTP request is made.

    ![Function trigger settings](case_asset_store_function_trigger_settings.jpg)

1. Select "Create a new API" with "API Name" `my_asset_store_api`, "Deployment stage" `api`, and "Security" "Open".  Press "Add".

1. Select the `create_address` node in the simple graph in the "Designer" box.

1. Under "Function code" select "Upload a .ZIP file" for the "Code entry type".  Click "Upload" and select the `create_address.zip` file that `build.sh` produced.  Change the "Handler" to `create_address.handler`.

    If you change the code, you can run `build.sh` and select "Upload a .ZIP file" to upload the new code at any time.

    ![Function code settings](case_asset_store_function_code_settings.jpg)

1. Add the following key value pairs in "Environment variables":

    * `MM_USERNAME`: This is your micromicro username.

    * `MM_TOKEN`: When you login to micromicro you get a login token - you can find this by opening your browser's developer tools when logged into micromicro and on the micromicro app page and checking the `config` store in micromicro's local storage.  You should see a value named `token`.

1. Under "Basic settings" change "Timeout" to 1 minute 0 seconds, just in case.

1. Press "Save" in the top right.

The function's done!

##### Testing the function

You can test it out now:

1. In the dropdown next to the "Test" button select "Configure test events".

1. Name the event `basic` and replace the payload with:

    ```
    {
      "body": "{\"id\": \"asset1.txt\", \"email\": \"YOUREMAIL@HOST.com\"}"
    }
    ```

    (modify the email address)

1. Press "Create"

1. Make sure `basic` is selected in the dropdown and press "Test"

With any luck it succeeded and you should see a base 64 value like `a1b2c3d4e=` after `"body": ` in the test details.

##### Debugging the function

If there was an error, you can view logs by:

1. Clicking the "Services" dropdown and selecting "CloudWatch" under "Management Tools".

1. Click "Logs" on the left

1. Open the `/aws/lambda/create_address` log group.

1. Then open the latest log stream.  If there were any errors from Python you should see them there.

### 4. Create the webpage

The website design is simple.  When a user clicks on an asset to purchase, they are prompted for their email if they haven't provided one yet and then a payment address is displayed.

The Javascript calls the Lambda function we created in the second step to create the payment address, so first we need to update it with the Lambda URL.

##### Modifying the source code

1. Click the "Services" dropdown and select "API Gateway" under "Networking & Content Delivery".  Click "my_asset_store_api".

    ![API Gateway screen](case_asset_store_api_gateway_screen.jpg)

1. Click "Stages" in the left tree, expand the `api` stage, and click the `POST` resource under `/create_address`.

1. Copy the "Invoke URL".

1. Edit `html/index.js` and replace the text that says `CREATE ADDRESS URL` with the URL we just copied.

1. Run `build.sh` in the repository root directory again to update all the files.  This bundles the javascript and puts everything for the website in the `html/build/` directory.

##### Publishing the website

1. Click on the "Services" dropdown and select "S3" again under "Storage".

1. Click "Create Bucket" and enter a name for your website bucket.  We'll use `mmex-my-asset-store`.  Press "Next".

1. Press "Next" on the properties page.

1. Select "Grant public read access to this bucket" under "Manage public permissions" on the permissions page.  Press "Next".

    ![Bucket public access](case_asset_store_s3_public_access.jpg)

1. Press "Create bucket"

1. Open the bucket and press "Upload".  Select all the files from `html/build/`.  On the permissions page select "Grant public read access to this object(s)".  Finish uploading the items.

1. On the bucket page, click on the "Properties" tab at the top.  Click "Static website hosting", select "Use this bucket to host a website" and enter "index.html" in the "Index document" text box.  Press "Save".

    ![Static website hosting settings](case_asset_store_s3_hosting_settings.jpg)

1. Go back to the "Overview" tab.  Click on `index.html`.  Visit the "Link" at the bottom - if you can view the website you've done everything correctly!

![Finished website](case_asset_store_uploaded_website.jpg)

### 4. Create a Lambda function to send download links

This Lambda function will be used as a webhook (a machine-used URL) that's called by micromicro when a payment is made.  micromicro will send transaction details to the webhook including the message we attached to the address when it was created - the asset id and the customer email address.

The function creates the download link for the specified content and sends it in an email to the customer.

1. The steps are fairly similar to those for the `create_address` function.  You can reuse the api gateway and `api` stage we created before.  Replace `create_address` with `send_email` everywhere.

    Create a role with name `send_email_role` and the "S3 object read-only permissions" policy template.

    Configure these environment variables:

    * `SEND_EMAIL`: The email address that will send links to customers.  This is also used to log into the mail server, so if you use a separate name to log in you'll have to modify the code.
    
    * `SEND_EMAIL_SERVER`: The (SMTP) mail server.

    * `SEND_EMAIL_PORT`: The mail server port.

    * `SEND_EMAIL_STARTTLS`: Set to `1` if starttls/ssl is used to connect to the server, otherwise `0`.

    * `SEND_EMAIL_USERNAME`: The username to log into the mail server.  This may be the same as `SEND_EMAIL`.

    * `SEND_EMAIL_PASSWORD`: The password for the email address.

    * `SEND_TOKEN`: To prevent people from accessing downloads by sending fake data to the webhook we'll create a secret token to include in the request.  Come up with 40 or so random numbers and letters and put them in the "Value" text box.  You can use [random.org](random.org/passwords/?num=5&len=20&format=html&rnd=new) or another random data generator of your choice.

1. You can test the function with this payload:

    ```
    {
      "queryStringParameters": {"t": "YOURTOKEN"},
      "body": "{\"message\": \"{\\\"name\\\": \\\"testing product name\\\", \\\"email\\\": \\\"YOUREMAIL@HOST.com\\\", \\\"id\\\": \\\"asset2.txt\\\"}\"}"
    }
    ```

    (replace the token with the one from `SEND_TOKEN` and the email address with your own)

    If it works, you should get an email with a download link for `asset2.txt`.

1. Copy the `POST` API Gateway resource URL for `send_email` in the same way that we did when setting up the website.

1. Log into micromicro, open "Settings", and paste the URL.  At the end of the URL add `?t=` and then the value you used for `SEND_TOKEN`.  Save the settings.

1. Press the "Test Webhook" button.  If you open the `send_email` Lambda function in AWS and go to the "Monitoring" tab you should see the invocation count has increased.

### 5. Trying it all out

Open your website again and try purchasing something.  You might need to make another micromicro account and transfer some money to it to make the payment.  A few seconds after you've paid you should get an email with the download link.

![Showing a payment address on the website](case_asset_store_payment_address.jpg)

If something breaks, double check the previous steps and follow the debugging instructions there.  If you've made extra changes on your own, try reverting them and re adding them one at a time until you identify what caused it to fail.

Of course the store's pretty bare-bones as it is, but you can go anywhere from here!