import React from 'react';
import type { SignupReferenceDomicile } from '../../../api/auth';
import { GoogleMapAddressField } from '../../../components/AddressBook/GoogleMapAddressField';
import type { ParsedPlaceAddress } from '../../../pages/AddressBook/utils/parseGooglePlaceAddress';
import { useTranslation } from '../../../hooks/useTranslation';

type AddressStepProps = {
  streetAddress: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  addressCountry: string;
  lat: string;
  lng: string;
  countriesDomicile: SignupReferenceDomicile[];
  onChange: (patch: {
    street_address?: string;
    address_line_2?: string;
    postal_code?: string;
    city?: string;
    address_country?: string;
    lat?: string;
    lng?: string;
  }) => void;
  errors: {
    street_address?: string;
    postal_code?: string;
    city?: string;
    address_country?: string;
  };
  disabled?: boolean;
};

export const AddressStep: React.FC<AddressStepProps> = ({
  streetAddress,
  addressLine2,
  postalCode,
  city,
  addressCountry,
  lat,
  lng,
  countriesDomicile,
  onChange,
  errors,
  disabled,
}) => {
  const { t } = useTranslation();

  const handlePlaceSelected = (place: ParsedPlaceAddress) => {
    const matchCountry =
      countriesDomicile.find(
        (c) =>
          c.value.toLowerCase() === place.country.toLowerCase() ||
          c.label.toLowerCase() === place.country.toLowerCase()
      )?.value || place.country;

    onChange({
      street_address: place.address || place.formattedAddress,
      city: place.city || city,
      postal_code: place.postalCode || postalCode,
      address_country: matchCountry || addressCountry,
      lat: place.lat,
      lng: place.lng,
    });
  };

  return (
    <>
      <div className="reg-field" data-reg-field="street_address">
        <GoogleMapAddressField
          inputId="register-street"
          address={streetAddress}
          lat={lat}
          lng={lng}
          hideLabel
          hideHint
          onAddressChange={(v) => onChange({ street_address: v })}
          onLatLngChange={(nextLat, nextLng) => onChange({ lat: nextLat, lng: nextLng })}
          onPlaceSelected={handlePlaceSelected}
        />
        <small className="reg-hint">
          {t('registerStreetHint', 'Start typing to search for your address')}
        </small>
        {errors.street_address && (
          <p className="reg-error" role="alert">
            {errors.street_address}
          </p>
        )}
      </div>

      <div className="reg-field">
        <input
          id="register-address-line-2"
          className="reg-input"
          value={addressLine2}
          disabled={disabled}
          onChange={(e) => onChange({ address_line_2: e.target.value })}
          placeholder={t('registerAddressLine2', 'Address Line 2 (apt., unit #, floor, etc.)')}
          aria-label={t('registerAddressLine2', 'Address Line 2 (apt., unit #, floor, etc.)')}
        />
      </div>

      <div className="reg-field" data-reg-field="postal_code">
        <input
          id="register-postal"
          className="reg-input"
          value={postalCode}
          disabled={disabled}
          onChange={(e) => onChange({ postal_code: e.target.value })}
          placeholder={`${t('registerPostal', 'Postal Code')}*`}
          aria-label={t('registerPostal', 'Postal Code')}
        />
        {errors.postal_code && (
          <p className="reg-error" role="alert">
            {errors.postal_code}
          </p>
        )}
      </div>

      <div className="reg-field" data-reg-field="city">
        <input
          id="register-city"
          className="reg-input"
          value={city}
          disabled={disabled}
          onChange={(e) => onChange({ city: e.target.value })}
          placeholder={`${t('registerCity', 'City')}*`}
          aria-label={t('registerCity', 'City')}
        />
        {errors.city && (
          <p className="reg-error" role="alert">
            {errors.city}
          </p>
        )}
      </div>

      <div className="reg-field" data-reg-field="address_country">
        <select
          id="register-country"
          className="reg-select"
          value={addressCountry}
          disabled={disabled}
          onChange={(e) => onChange({ address_country: e.target.value })}
          aria-label={t('registerCountry', 'Country')}
        >
          <option value="">{`${t('registerCountryPlaceholder', 'Select Country')}*`}</option>
          {countriesDomicile.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label || c.value}
            </option>
          ))}
        </select>
        {errors.address_country && (
          <p className="reg-error" role="alert">
            {errors.address_country}
          </p>
        )}
      </div>
    </>
  );
};
