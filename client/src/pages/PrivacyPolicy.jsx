import { Link } from 'react-router-dom';
import { PRIVACY_POLICY } from '../content/privacyPolicy';

export default function PrivacyPolicy() {
  const { title, effectiveDate, intro, sections } = PRIVACY_POLICY;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="text-lg font-bold text-green-600 no-underline">
            MyKitchenList
          </Link>
          <Link to="/auth/sign-in" className="text-sm font-medium text-gray-600 no-underline hover:text-green-600">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Effective {effectiveDate}</p>
        <p className="mt-6 text-base leading-relaxed text-gray-700">{intro}</p>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold text-gray-900">{section.heading}</h2>
              <div className="mt-3 space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="text-base leading-relaxed text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
