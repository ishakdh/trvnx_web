## JOSON CONGFIR AND QR CODE 

```
{
 "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME":
 "com.rrapp/.MyDeviceAdminReceiver",

 "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION":
 "https://trvnx.com/rrapp.apk",

 "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM":
 "BASE64_CHECKSUM",

 "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": true
}


{
 "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME":
 "com.rrapp/.MyDeviceAdminReceiver",

 "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION":
 "https://yourserver.com/rrapp.apk",

 "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM":
 "BASE64_CHECKSUM",

 "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": true
}
```

### Backend Stacks:
[] Node.js + Express
[] PostgreSQL

### API ENDPOINTS
POST /shopkeeper/register
POST /shopkeeper/login
POST /customer/create
POST /installment/create
POST /license/generate
POST /device/register
POST /device/lock
POST /device/unlock
POST /otp/generate
GET /installments


### ADMIN PAGES
Admin pages:

Dashboard
Shopkeepers
Salesmen
Customers
Devices
Licenses
Payments
Reports


### DB STURCUTUR
shopkeepers
salesmen
customers
references
products
installments
payments
licenses
devices
transactions


### Run Migration

``` npm run make:migration ```
``` npm run make:migration users --module=auth ```
``` npm run migrate:migration ```
``` npm run migrate ```
``` npm run migrate:rollback ```
``` npm run make:model ModelName -- -m  ``` (With Migration with the model name table)
``` npm run db:seed```


### ENDPOINT LIST
```
http://locahost:5000/api/auth/register
http://locahost:5000/api/auth/login


POST {
    "name": "Moniruzzaman Rony",
    "email": "littlegeeks@gmail.com",
    "password": "123456",
    "phone": "01837664478",
    "type": "regular",
    "address": "uttara",
    "area": "Goaltek",
    "city": "Dhaka",
    "state": "Dhaka",
    "post_code":"1230",
    "police_station":"Faidabad",
    "status": "Active",
    "email_verified_at": "2026-03-15"

}
http://localhost:5000/api/customer/create
 
 
POST {
 "customer_id": 1,
 "user_id": 1,
 "order_type": "installment",
 "total_amount": 5000,
 "due_amount": 2500,
 "paid_amount": 5000,
 "status": "pending",
 "type": "buy"
 }
 http://localhost:5000/api/order/create
 
http://locahost:5000/api/customer/login
```



### LIFECYCLE
1. App install with QR CODE so that it have DEVICE ADMIN/WONER
2. Submit a License Key in the App input  : Sync all Customer + Order Data -> Installment data from the API response
3. Data need to save in app database.
4. Data need to sync in every 1hour interval if net exist
5. If any due_date from the api response passed the current date and the status: "unpaid" then "Lock screen" and app automatically opened on the screen
6. OTP unlock support the otp is stored in the api response data with the installment information 
7. if the api response deviceAdminStatus: false then "Device Admin Disabled" otherwise "Device Admin Enabled" or if all installment is paid then "Device Admin Disabled"
