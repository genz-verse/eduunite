<?php

session_start();

$data = json_decode(file_get_contents("php://input"), true);

$mobile = $data['mobile'];

$otp = rand(1000, 9999);
$validity = 5;

$_SESSION['otp'] = $otp;
$_SESSION['mobile'] = $mobile;

// Fast2SMS DLT
$apiKey = "5yt4Z8NiELVHmSCpgFdTSdeFM3ppPYqZcNVpoS7HeHKBfQbGjYzd2PxbtPDN";
$senderId = "RMGOEM";
$templateId = "217348";

$variables = urlencode($otp . "|" . $validity);

$url = "https://www.fast2sms.com/dev/bulkV2?authorization=$apiKey&route=dlt&sender_id=$senderId&message=$templateId&variables_values=$variables&flash=0&numbers=$mobile";

$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => "GET"
]);

$response = curl_exec($curl);
$error = curl_error($curl);

curl_close($curl);

file_put_contents(
    "sms-log.txt",
    date('Y-m-d H:i:s')."\n".$response."\n\n",
    FILE_APPEND
);

echo json_encode([
    "success" => true,
    "response" => json_decode($response, true)
]);