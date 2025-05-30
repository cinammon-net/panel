<!DOCTYPE html>
<html lang="en" class="bg-black text-pink-400 font-orbitron select-none h-full">

<head>
  <meta charset="UTF-8" />
  <title>Accept Terms</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    .font-orbitron {
      font-family: 'Orbitron', sans-serif;
    }
  </style>
</head>

<body class="flex items-center justify-center min-h-screen p-6">
  <div class="text-center max-w-md w-full">
    <h1 class="text-4xl font-bold mb-6 drop-shadow-[0_0_10px_rgb(255_0_255_/_0.7)]">
      Please accept our Terms and Privacy Policy
    </h1>
    <form method="POST" action="{{ route('terms.accept.post') }}">
      @csrf
      <p class="mb-8 text-lg leading-relaxed">
        You must accept our
        <a href="{{ route('terms') }}" target="_blank" class="text-pink-500 underline hover:text-pink-300 transition">
          Terms and Conditions
        </a>
        and
        <a href="{{ route('privacy') }}" target="_blank" class="text-pink-500 underline hover:text-pink-300 transition">
          Privacy Policy
        </a>
        to continue using the site.
      </p>
      <button
        type="submit"
        class="bg-pink-600 hover:bg-pink-400 text-black font-bold py-3 px-8 rounded-full shadow-[0_0_20px_rgb(255_0_255_/_0.7)] transition-all duration-300"
      >
        I Accept
      </button>
    </form>
  </div>
</body>

</html>
