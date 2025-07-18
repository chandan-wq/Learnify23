<?php
$responseText = "";
if ($_SERVER["REQUEST_METHOD"] == "POST" && !empty($_POST['question'])) {
  $apiKey = "sk-a8a4cc77d209476a85c2da294694cd9b"; // Your OpenAI API key
  $question = $_POST['question'];

  $data = [
    "model" => "gpt-3.5-turbo",
    "messages" => [
      ["role" => "user", "content" => $question]
    ]
  ];

  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, "https://api.openai.com/v1/chat/completions");
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer $apiKey"
  ]);
  curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
  $response = curl_exec($ch);
  curl_close($ch);

  $result = json_decode($response, true);
  $responseText = $result['choices'][0]['message']['content'] ?? "❌ No response from OpenAI.";
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SolverAI 22221 - One File App</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
      color: white;
      text-align: center;
      padding: 20px;
    }

    input, button {
      font-size: 16px;
      padding: 12px;
      margin: 10px;
      border-radius: 6px;
      border: none;
    }

    input {
      width: 80%;
      max-width: 500px;
    }

    button {
      background-color: #00bcd4;
      color: white;
      cursor: pointer;
    }

    button:hover {
      background-color: #0097a7;
    }

    #answer {
      margin-top: 20px;
      padding: 20px;
      background: #1e1e1e;
      border-radius: 10px;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>

  <h1>🔍 SolverAI 22221</h1>

  <form method="POST">
    <input type="text" name="question" placeholder="Type your question..." required>
    <br>
    <button type="submit">Get Answer</button>
  </form>

  <div id="answer">
    <?php if (!empty($responseText)) echo nl2br(htmlspecialchars($responseText)); ?>
  </div>

</body>
</html>
