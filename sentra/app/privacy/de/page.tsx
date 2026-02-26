export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl font-bold text-gray-900 mb-8">Datenschutzerklärung</h1>
                
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Verantwortliche Stelle</h2>
                    <p className="text-gray-700 mb-4">
                        Für die Datenverarbeitung auf dieser Website ist verantwortlich:
                    </p>
                    <p className="text-gray-700">
                        [Unternehmensname]<br/>
                        [Adresse]<br/>
                        [Kontaktdaten]
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Erhebung und Verarbeitung personenbezogener Daten</h2>
                    <p className="text-gray-700">
                        Wir verarbeiten personenbezogene Daten nur, wenn dies rechtlich zulässig ist. Die Verarbeitung erfolgt auf Grundlage von:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 mt-2">
                        <li>Ihrer ausdrücklichen Einwilligung (Art. 6 Abs. 1 DSGVO)</li>
                        <li>Erfüllung eines Vertrags (Art. 6 Abs. 1 DSGVO)</li>
                        <li>Erfüllung einer rechtlichen Verpflichtung (Art. 6 Abs. 1 DSGVO)</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Ihre Rechte</h2>
                    <p className="text-gray-700">
                        Sie haben das Recht auf:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 mt-2">
                        <li>Auskunft über Ihre Daten</li>
                        <li>Berichtigung unrichtiger Daten</li>
                        <li>Löschung Ihrer Daten</li>
                        <li>Einschränkung der Verarbeitung</li>
                        <li>Widerspruch gegen die Verarbeitung</li>
                        <li>Datenportabilität</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Kontakt</h2>
                    <p className="text-gray-700">
                        Bei Fragen zum Datenschutz kontaktieren Sie uns unter:<br/>
                        E-Mail: [E-Mail-Adresse]<br/>
                        Telefon: [Telefonnummer]
                    </p>
                </section>
            </div>
        </div>
    );
}