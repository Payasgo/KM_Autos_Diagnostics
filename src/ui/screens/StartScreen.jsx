/** The first screen: who we are, what this is, and the three ways in. */

import { GraduationCap, Mail, MapPin, Phone, SlidersHorizontal, Wrench } from 'lucide-react';
import React from 'react';

import logoUrl from '../../assets/brand/logo-full.webp';
import { Button } from '../primitives/Button.jsx';

import styles from './StartScreen.module.css';

/**
 * The three ways in, in the order a newcomer should meet them.
 *
 * CAREER is first and is the primary action, because a customer car with a fault in it
 * is the only one of the three that tells you what you are trying to achieve. A sandbox
 * with no objective is the right tool once you know what you are doing and a poor place
 * to start, and the tutorial is a detour a returning player does not want.
 */
const WAYS_IN = [
  { key: 'career', label: 'CAREER', variant: 'primary', icon: Wrench, caption: 'Customer cars with real faults to diagnose' },
  { key: 'sandbox', label: 'SANDBOX', variant: 'ghost', icon: SlidersHorizontal, caption: 'Build and tune anything, no objectives' },
  { key: 'tutorial', label: 'TUTORIAL', variant: 'quiet', icon: GraduationCap, caption: 'The whole loop, one step at a time' },
];

/** What the workshop does, from the KM Autos business card. */
const SERVICES = ['ECM', 'BCM', 'TCM', 'KEY CODING', 'EPS REPAIR'];

/**
 * @param {object} props
 * @param {() => void} props.onCareer open the job board
 * @param {() => void} props.onStart open the sandbox
 * @param {() => void} props.onTutorial
 * @param {string} props.version
 * @returns {React.ReactElement}
 */
export function StartScreen({ onCareer, onStart, onTutorial, version }) {
  const handlers = { career: onCareer, sandbox: onStart, tutorial: onTutorial };
  return (
    <div className={styles.screen}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.inner}>
        <img className={styles.logo} src={logoUrl} alt="KM Autos Diagnostics" width="805" height="545" />
        <p className={styles.motto}>Diagnose · Repair · Drive confidently</p>
        <h1 className={styles.title}>Engine Management Sandbox</h1>
        <p className={styles.blurb}>
          Design an engine. Tune it. Log it. Improve it. A free-tune sandbox built to
          teach real engine management, not just move sliders.
        </p>
        <div className={styles.actions}>
          {WAYS_IN.map((way) => (
            <div key={way.key} className={styles.way} data-primary={way.variant === 'primary' ? '' : undefined}>
              <way.icon className={styles.wayIcon} size={22} aria-hidden="true" />
              <Button
                size="lg"
                block
                variant={/** @type {'primary'|'ghost'|'quiet'} */ (way.variant)}
                onClick={handlers[way.key]}
              >
                {way.label}
              </Button>
              <div className={styles.caption}>{way.caption}</div>
            </div>
          ))}
        </div>
        <ul className={styles.services} aria-label="Services">
          {SERVICES.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <div className={styles.contact}>
          <a href="tel:+919866621114"><Phone size={14} aria-hidden="true" /> +91 98666 21114</a>
          <a href="mailto:kranthikmauto@gmail.com"><Mail size={14} aria-hidden="true" /> kranthikmauto@gmail.com</a>
          <span><MapPin size={14} aria-hidden="true" /> Kukatpally, Hyderabad</span>
        </div>
        <div className={styles.foot}>
          <span className={styles.version}>{version}</span>
          <a className={styles.website} href="https://www.kmautoecm.com/" target="_blank" rel="noreferrer">www.kmautoecm.com</a>
          <span className={styles.owner}>KranthiKumar Yarlagadda</span>
        </div>
      </div>
    </div>
  );
}
