import React, { useCallback, useMemo, useState } from 'react';

const API_URL = 'https://restcountries.com/v3.1/name/';

type CountryDetails = {
  name: string;
  capital?: string[];
  region?: string;
  population?: number;
  languages?: Record<string, string>;
  flag?: string;
};

const formatLanguages = (languages?: Record<string, string>) => {
  if (!languages) return '–';
  const values = Object.values(languages);
  return values.length ? values.join(', ') : '–';
};

const formatNumber = (value?: number) => {
  if (!value && value !== 0) return '–';
  return value.toLocaleString('de-DE');
};

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [details, setDetails] = useState<CountryDetails | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const hasResult = useMemo(() => !!details, [details]);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();

    if (!trimmed) {
      setMessage('Bitte ein Land eingeben!');
      setDetails(null);
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}${encodeURIComponent(trimmed)}`);

      if (!response.ok) {
        setMessage('Land nicht gefunden!');
        setDetails(null);
        return;
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        setMessage('Land nicht gefunden!');
        setDetails(null);
        return;
      }

      const country = data[0];
      setDetails({
        name: country?.name?.common ?? trimmed,
        capital: country?.capital,
        region: country?.region,
        population: country?.population,
        languages: country?.languages,
        flag: country?.flags?.png ?? country?.flags?.svg,
      });
    } catch (error) {
      console.error('Fehler beim Abrufen', error);
      setMessage('Fehler beim Abrufen!');
      setDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const onSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      void handleSearch();
    },
    [handleSearch],
  );

  return (
    <div className="page">
      <div className="box" role="main">
        <h1>🌍 Länder-Finder App</h1>
        <p className="subtitle">Gib ein Land ein (z. B. Germany, France, Pakistan...)</p>

        <form className="form" onSubmit={onSubmit}>
          <input
            id="country"
            placeholder="Land eingeben..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Land suchen"
            autoComplete="country-name"
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Suche...' : 'Suchen'}
          </button>
        </form>

        <div id="result" className="result" aria-live="polite">
          {message && <div className="message">{message}</div>}
          {hasResult && details && (
            <div className="card">
              <h2>{details.name}</h2>
              <p>
                <b>Hauptstadt:</b> {details.capital?.join(', ') ?? '–'}
              </p>
              <p>
                <b>Region:</b> {details.region ?? '–'}
              </p>
              <p>
                <b>Bevölkerung:</b> {formatNumber(details.population)}
              </p>
              <p>
                <b>Sprachen:</b> {formatLanguages(details.languages)}
              </p>
              {details.flag && <img src={details.flag} alt={`Flagge von ${details.name}`} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
