export default function PrivacyPage() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                <p className="mb-4">
                    We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
                <p className="mb-4">
                    We may collect information about you in a variety of ways. The information we may collect on the Site includes:
                </p>
                <ul className="list-disc pl-6 mb-4">
                    <li>Personal Data (name, email address, phone number)</li>
                    <li>Automatic Data (IP address, browser type, pages visited)</li>
                    <li>Cookies and similar tracking technologies</li>
                </ul>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">3. Use of Your Information</h2>
                <p className="mb-4">
                    Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:
                </p>
                <ul className="list-disc pl-6 mb-4">
                    <li>Generate a personal profile about you</li>
                    <li>Increase the efficiency and operation of the Site</li>
                    <li>Monitor and analyze trends, usage, and activities</li>
                </ul>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">4. Disclosure of Your Information</h2>
                <p className="mb-4">
                    We may share information we have collected about you in certain situations:
                </p>
                <ul className="list-disc pl-6 mb-4">
                    <li>By Law or to Protect Rights</li>
                    <li>Third-party service providers</li>
                    <li>Business transfers</li>
                </ul>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">5. Security of Your Information</h2>
                <p className="mb-4">
                    We use administrative, technical, and physical security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
                <p className="mb-4">
                    If you have questions or comments about this Privacy Policy, please contact us at:
                </p>
                <p className="font-semibold">privacy@sentra.com</p>
            </section>

            <p className="text-sm text-gray-600 mt-12">
                Last updated: {new Date().getFullYear()}
            </p>
        </div>
    );
}