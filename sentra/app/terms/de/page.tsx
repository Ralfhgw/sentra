export default function TermsPage() {
    return (
        <div className="prose max-w-4xl mx-auto px-4 py-12">
            <h1>Nutzungsbedingungen</h1>
            
            <section>
                <h2>1. Geltungsbereich</h2>
                <p>
                    Diese Nutzungsbedingungen regeln die Verwendung unserer Website und Dienstleistungen.
                    Durch die Nutzung unserer Website stimmen Sie diesen Bedingungen zu.
                </p>
            </section>

            <section>
                <h2>2. Unternehmensangaben</h2>
                <p>
                    Betreiber dieser Website ist: [Ihr Unternehmensname]<br />
                    [Adresse]<br />
                    [Kontaktdaten]
                </p>
            </section>

            <section>
                <h2>3. Haftungsausschluss</h2>
                <p>
                    Alle Inhalte werden ohne Gewähr bereitgestellt. Wir übernehmen keine Haftung
                    für Schäden, die durch die Nutzung der Website entstehen.
                </p>
            </section>

            <section>
                <h2>4. Urheberrecht</h2>
                <p>
                    Alle Inhalte dieser Website sind urheberrechtlich geschützt. Eine Vervielfältigung
                    oder Weitergabe ohne ausdrückliche Genehmigung ist untersagt.
                </p>
            </section>

            <section>
                <h2>5. Datenschutz</h2>
                <p>
                    Die Verarbeitung personenbezogener Daten erfolgt gemäß unserer Datenschutzerklärung.
                </p>
            </section>

            <section>
                <h2>6. Beschränkung der Nutzung</h2>
                <p>
                    Untersagt ist insbesondere: illegale Aktivitäten, Belästigung von Benutzern,
                    Verbreitung von Malware oder Spam.
                </p>
            </section>

            <section>
                <h2>7. Änderungen der Bedingungen</h2>
                <p>
                    Wir behalten uns das Recht vor, diese Nutzungsbedingungen jederzeit zu ändern.
                    Änderungen werden auf dieser Seite veröffentlicht.
                </p>
            </section>

            <section>
                <h2>8. Geltendes Recht</h2>
                <p>
                    Dieses Rechtsverhältnis unterliegt deutschem Recht. Gerichtsstand ist [Ort].
                </p>
            </section>

            <p className="mt-12 text-sm text-gray-600">
                Zuletzt aktualisiert: {new Date().toLocaleDateString('de-DE')}
            </p>
        </div>
    );
}