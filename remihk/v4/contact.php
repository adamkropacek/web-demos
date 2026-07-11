<?php
// REMI HK - kontaktni formular -> email
// From: web@remihk.cz (domena hostingu, SPF-safe), Reply-To: lead

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

const RECIPIENT = 'rsobolikova@post.cz';
const SENDER    = 'web@remihk.cz';

function fail(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('Pouze POST.', 405);

// honeypot - boti vyplni skryte pole
if (!empty($_POST['website'])) { echo json_encode(['ok' => true]); exit; }

// rate limit 1 odeslani / 30 s / IP  (ponytail: souborovy zamek staci, DB az pri realnem spamu)
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$lock = sys_get_temp_dir() . '/remihk_cf_' . md5($ip);
if (is_file($lock) && time() - (int)filemtime($lock) < 30) fail('Zkuste to prosím za chvíli znovu.', 429);
@touch($lock);

$name    = trim((string)($_POST['name'] ?? ''));
$email   = trim((string)($_POST['email'] ?? ''));
$phone   = trim((string)($_POST['phone'] ?? ''));
$message = trim((string)($_POST['message'] ?? ''));

if ($name === '' || mb_strlen($name) > 120)        fail('Vyplňte prosím jméno.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL))     fail('Vyplňte prosím platný e-mail.');
if (mb_strlen($phone) > 40 || mb_strlen($message) > 5000) fail('Zpráva je příliš dlouhá.');
if (empty($_POST['consent']))                       fail('Potvrďte prosím souhlas se zpracováním údajů.');
// header injection guard
foreach ([$name, $email, $phone] as $v) {
    if (preg_match('/[\r\n]/', $v)) fail('Neplatný vstup.');
}

$body = "Nová poptávka z webu remihk.cz\n"
      . str_repeat('-', 40) . "\n"
      . "Jméno:   $name\n"
      . "E-mail:  $email\n"
      . "Telefon: " . ($phone !== '' ? $phone : '-') . "\n"
      . str_repeat('-', 40) . "\n\n"
      . ($message !== '' ? $message : '(bez zprávy)') . "\n";

$subject = '=?UTF-8?B?' . base64_encode("Nová poptávka z webu - $name") . '?=';
$fromName = '=?UTF-8?B?' . base64_encode('Poptávka z webu REMI HK') . '?=';
$headers = "From: $fromName <" . SENDER . ">\r\n"
         . "Reply-To: $email\r\n"
         . "MIME-Version: 1.0\r\n"
         . "Content-Type: text/plain; charset=utf-8\r\n"
         . "Content-Transfer-Encoding: 8bit\r\n"
         . "X-Mailer: remihk.cz contact form";

$sent = mail(RECIPIENT, $subject, $body, $headers, '-f' . SENDER);
if (!$sent) fail('E-mail se nepodařilo odeslat. Zavolejte prosím na +420 602 484 982.', 500);

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
