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
    <div className="shipper-register-step">
      <div className="shipper-login-field shipper-register-places-field">
        <label htmlFor="register-street">{t('registerStreet', 'Address (street name and number)')}</label>
        <GoogleMapAddressField
          inputId="register-street"
          address={streetAddress}
          lat={lat}
          lng={lng}
          hideLabel
          onAddressChange={(v) => onChange({ street_address: v })}
          onLatLngChange={(nextLat, nextLng) => onChange({ lat: nextLat, lng: nextLng })}
          onPlaceSelected={handlePlaceSelected}
          error={errors.street_address}
        />
        {!errors.street_address && (
          <p className="shipper-register-field-hint">
            {t('registerStreetHint', 'Start typing to search for your address')}
          </p>
        )}
      </div>

      <div className="shipper-login-field">
        <label htmlFor="register-address-line-2">{t('registerAddressLine2', 'Address Line 2 (apt., unit #, floor, etc.)')}</label>
        <input
          id="register-address-line-2"
          className="shipper-login-control"
          value={addressLine2}
          disabled={disabled}
          onChange={(e) => onChange({ address_line_2: e.target.value })}
          placeholder={t('registerAddressLine2Placeholder', 'Apt., unit, floor (optional)')}
        />
      </div>

      <div className="shipper-register-row">
        <div className="shipper-login-field shipper-register-row-item">
          <label htmlFor="register-postal">{t('registerPostal', 'Postal Code')}</label>
          <input
            id="register-postal"
            className="shipper-login-control"
            value={postalCode}
            disabled={disabled}
            onChange={(e) => onChange({ postal_code: e.target.value })}
            placeholder={t('registerPostalPlaceholder', 'Postal Code')}
          />
          {errors.postal_code && (
            <p className="shipper-login-field-error" role="alert">
              {errors.postal_code}
            </p>
          )}
        </div>
        <div className="shipper-login-field shipper-register-row-item shipper-register-row-item--grow">
          <label htmlFor="register-city">{t('registerCity', 'City')}</label>
          <input
            id="register-city"
            className="shipper-login-control"
            value={city}
            disabled={disabled}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder={t('registerCityPlaceholder', 'City')}
          />
          {errors.city && (
            <p className="shipper-login-field-error" role="alert">
              {errors.city}
            </p>
          )}
        </div>
      </div>

      <div className="shipper-login-field">
        <label htmlFor="register-country">{t('registerCountry', 'Country')}</label>
        <select
          id="register-country"
          className="shipper-login-control"
          value={addressCountry}
          disabled={disabled}
          onChange={(e) => onChange({ address_country: e.target.value })}
        >
          <option value="">{t('registerCountryPlaceholder', 'Select Country')}</option>
          {countriesDomicile.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label || c.value}
            </option>
          ))}
        </select>
        {errors.address_country && (
          <p className="shipper-login-field-error" role="alert">
            {errors.address_country}
          </p>
        )}
      </div>
    </div>
  );
};
