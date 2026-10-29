/**
 * The site-wide backdrop: rich red-and-black with the KM Autos horse and speedometer
 * behind everything. Fixed and non-interactive, so every screen (start, tutorial, the
 * app shell) sits on the same artwork and no screen needs to know about it.
 */

import React from 'react';

import horseUrl from '../../assets/brand/horse-gauge.webp';

import styles from './BrandBackdrop.module.css';

/** @returns {React.ReactElement} */
export function BrandBackdrop() {
  return (
    <div className={styles.root} aria-hidden="true">
      <div className={styles.hex} />
      <img className={styles.horse} src={horseUrl} alt="" />
      <div className={styles.streakA} />
      <div className={styles.streakB} />
      <div className={styles.vignette} />
    </div>
  );
}
