<?php

session_start();

$data = json_decode(file_get_contents("php://input"), true);

if (
    isset($_SESSION['otp']) &&
    $_SESSION['otp'] == $data['otp']
) {

    echo json_encode([
        "success" => true
    ]);

} else {

    echo json_encode([
        "success" => false
    ]);
}