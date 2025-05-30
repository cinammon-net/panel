<!DOCTYPE html>
<html lang="en" class="bg-[#0B0D1A] text-white scroll-smooth">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Terms & Conditions</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600&display=swap" rel="stylesheet" />
    <style>
        body {
            font-family: 'Orbitron', monospace, monospace;
        }

        ::-webkit-scrollbar {
            width: 10px;
        }

        ::-webkit-scrollbar-track {
            background: #0B0D1A;
        }

        ::-webkit-scrollbar-thumb {
            background-color: #7F1DFF;
            border-radius: 10px;
        }
    </style>
</head>

<body class="bg-gradient-to-br from-[#0B0D1A] via-[#1f1f2f] to-[#0B0D1A] min-h-screen text-gray-300 px-8 md:px-32 py-16">

    <header class="max-w-6xl mx-auto mb-16 text-center">
        <h1 class="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#7F1DFF] to-[#30D5F6] mb-6 tracking-widest uppercase drop-shadow-lg">
            Terms & Conditions
        </h1>
        <nav class="flex justify-center gap-12 mb-12">
            <a href="{{ route('privacy') }}" class="text-xl font-bold text-[#F93FFF] hover:text-[#7F1DFF] transition">Privacy Policy</a>
        </nav>
        <p class="max-w-4xl mx-auto text-purple-400 leading-relaxed">
            Please read these terms carefully before using Cinammon.net. By using our services, you agree to these terms.
        </p>
    </header>

    <main class="max-w-5xl mx-auto space-y-20">
        <section class="scroll-mt-28">
            <h2 class="text-3xl font-bold text-[#F93FFF] mb-6 border-b border-purple-700 pb-2">1. Account Management</h2>
            <ul class="list-disc list-inside ml-6 space-y-3 text-gray-300 leading-relaxed">
                <li>We reserve the right to cancel your account at any time, with or without prior notice.</li>
                <li>When you request a server or other service from Cinammon.net, you are renting the hosting service only. All servers remain the property of Cinammon.net.</li>
                <li>You are responsible for maintaining the confidentiality of your account information and all activities under your account. Notify us immediately of unauthorized use. Use sub-user access for others.</li>
            </ul>
        </section>

        <section>
            <h2 class="text-3xl font-bold text-[#F93FFF] mb-6 border-b border-purple-700 pb-2">2. Payment Process</h2>
            <ul class="list-disc list-inside ml-6 space-y-3 text-gray-300 leading-relaxed">
                <li>Services activate only after confirmed payment. Manual review may occur if fraud is suspected.</li>
                <li>If payment renewal is missed, your server will be suspended but data kept 7 days.</li>
                <li>Non-payment after 7 days will terminate the service and delete files permanently.</li>
                <li>Malicious chargebacks cause immediate cancellation and permanent service removal.</li>
                <li>Prices exclude taxes; applicable taxes added per billing by payment providers.</li>
            </ul>
        </section>

        <section>
            <h2 class="text-3xl font-bold text-[#F93FFF] mb-6 border-b border-purple-700 pb-2">3. Service Cancellations</h2>
            <ul class="list-disc list-inside ml-6 space-y-3 text-gray-300 leading-relaxed">
                <li>Cancel services via billing portal: <a href="https://billing.cinammon.net/home" class="text-[#30D5F6] underline" target="_blank">https://billing.cinammon.net/home</a></li>
                <li>Paypal automatic payments must be cancelled manually.</li>
                <li>Immediate cancellations do not qualify for refunds of unused days.</li>
            </ul>
        </section>

        <section>
            <h2 class="text-3xl font-bold text-[#F93FFF] mb-6 border-b border-purple-700 pb-2">4. Service Usage</h2>
            <ul class="list-disc list-inside ml-6 space-y-3 text-gray-300 leading-relaxed">
                <li>No bypassing limits (RAM, storage, CPU, slots). Violations result in suspension and account termination.</li>
                <li>Minecraft hosting starts with 50GB, expandable. Excessive files may be deleted.</li>
                <li>Teaspeak voice servers are permanent unless licensing changes affect availability. Compatibility with TeamSpeak3 supported but not guaranteed.</li>
            </ul>
        </section>

        <section>
            <h2 class="text-3xl font-bold text-[#F93FFF] mb-6 border-b border-purple-700 pb-2">5. Customer Obligations</h2>
            <ul class="list-disc list-inside ml-6 space-y-3 text-gray-300 leading-relaxed">
                <li>Illegal or pirated activities strictly prohibited. Violators banned.</li>
                <li>We comply with legal requests from government entities without notice.</li>
                <li>Servers must comply with developer EULA. Minecraft servers must accept Minecraft EULA before first use. See <a href="https://cinammon.net/games" class="text-[#30D5F6] underline" target="_blank">https://cinammon.net/games</a></li>
                <li>We are not affiliated with Mojang AB©.</li>
            </ul>
        </section>

        <section>
            <h2 class="text-3xl font-bold text-[#F93FFF] mb-6 border-b border-purple-700 pb-2">6. Liability</h2>
            <ul class="list-disc list-inside ml-6 space-y-3 text-gray-300 leading-relaxed">
                <li>We may change prices, rules, offers, or cancel services anytime without notice.</li>
                <li>Service interruptions, data loss, or delays may occur outside our control.</li>
                <li>We keep disaster recovery for active servers; users should backup their own data.</li>
                <li>Services are "as-is", no warranty. No liability for lost profits or damages.</li>
                <li>Service may be refused for any reason. Contact support@cinammon.net.</li>
            </ul>
        </section>

        <section>
            <h2 class="text-3xl font-bold text-[#F93FFF] mb-6 border-b border-purple-700 pb-2">7. Our Website</h2>
            <ul class="list-disc list-inside ml-6 space-y-3 text-gray-300 leading-relaxed">
                <li>Site info & terms may change anytime without notice.</li>
                <li>Stripe processes purchases. Users agree to <a href="https://stripe.com/legal" class="text-[#7F1DFF] underline" target="_blank">Stripe Terms</a>.</li>
                <li>Contact <a href="https://support.stripe.com" class="text-[#7F1DFF] underline" target="_blank">Stripe Support</a> for issues.</li>
            </ul>
        </section>
    </main>

    <footer class="mt-28 text-center text-gray-500 text-sm select-none">
        <div class="max-w-6xl mx-auto space-y-4">
            <p>&copy; 2025 Cinammon.net — All rights reserved.</p>
            <div class="flex justify-center gap-6">
                <a href="https://www.facebook.com/Cinammon" target="_blank" rel="noopener noreferrer" class="text-[#7F1DFF] hover:text-[#30D5F6] transition">Facebook</a>
                <a href="https://twitter.com/Cinammon" target="_blank" rel="noopener noreferrer" class="text-[#7F1DFF] hover:text-[#30D5F6] transition">Twitter</a>
                <a href="https://discord.gg/Hikarinet" target="_blank" rel="noopener noreferrer" class="text-[#7F1DFF] hover:text-[#30D5F6] transition">Discord</a>
                <a href="https://www.instagram.com/Cinammon" target="_blank" rel="noopener noreferrer" class="text-[#7F1DFF] hover:text-[#30D5F6] transition">Instagram</a>
            </div>
            <p class="text-gray-400 text-xs">
                By using this website, you agree to our <a href="/privacy" class="text-[#30D5F6] underline">Privacy Policy</a> and <a href="/terms" class="text-[#30D5F6] underline">Terms & Conditions</a>.
            </p>
            <!-- Add Back to Home Link -->
            <div class="mt-4">
                <a href="/" class="text-[#7F1DFF] hover:text-[#30D5F6] transition">Back to Home</a>
            </div>
        </div>
    </footer>

</body>

</html>