'use client';

import React from 'react';
import '@/styles/coming-soon.css';

export default function Home() {

  return (
    <>
      <div className="bg" aria-hidden="true">
        <div className="bg__glow"></div>
        <div className="bg__crest"></div>
        <div className="motes">
          <span className="mote" style={{
            '--x': '16%',
            '--y': '26%',
            '--s': '3px',
            '--o': '.5',
            '--d': '12s',
            '--delay': '0s'
          } as React.CSSProperties}></span>
          <span className="mote" style={{
            '--x': '79%',
            '--y': '22%',
            '--s': '2px',
            '--o': '.42',
            '--d': '14s',
            '--delay': '1.6s'
          } as React.CSSProperties}></span>
          <span className="mote" style={{
            '--x': '30%',
            '--y': '68%',
            '--s': '2.5px',
            '--o': '.46',
            '--d': '11s',
            '--delay': '.8s'
          } as React.CSSProperties}></span>
          <span className="mote" style={{
            '--x': '88%',
            '--y': '60%',
            '--s': '3px',
            '--o': '.4',
            '--d': '15s',
            '--delay': '3.2s'
          } as React.CSSProperties}></span>
          <span className="mote" style={{
            '--x': '62%',
            '--y': '80%',
            '--s': '2px',
            '--o': '.5',
            '--d': '13s',
            '--delay': '2.1s'
          } as React.CSSProperties}></span>
          <span className="mote" style={{
            '--x': '10%',
            '--y': '54%',
            '--s': '2px',
            '--o': '.38',
            '--d': '16s',
            '--delay': '4.5s'
          } as React.CSSProperties}></span>
          <span className="mote" style={{
            '--x': '50%',
            '--y': '14%',
            '--s': '2.5px',
            '--o': '.44',
            '--d': '13.5s',
            '--delay': '5.4s'
          } as React.CSSProperties}></span>
          <span className="mote" style={{
            '--x': '72%',
            '--y': '40%',
            '--s': '2px',
            '--o': '.36',
            '--d': '12.5s',
            '--delay': '6.2s'
          } as React.CSSProperties}></span>
          <span className="mote" style={{
            '--x': '23%',
            '--y': '42%',
            '--s': '2px',
            '--o': '.4',
            '--d': '14.5s',
            '--delay': '7.1s'
          } as React.CSSProperties}></span>
        </div>
      </div>

      <div className="frame" aria-hidden="true">
        <span className="corner tl"></span>
        <span className="corner tr"></span>
        <span className="corner bl"></span>
        <span className="corner br"></span>
      </div>

      <main className="stage">
        <img
          className="crest reveal d1"
          src="/coming-soon/assets/crest-simple.png"
          alt="Starfall Academy crest"
          width={112}
          height={112}
        />
        <p className="eyebrow reveal d2">Starfall Academy</p>
        <h1 className="headline reveal d3">
          Something is stirring in the ley lines<span className="ell">…</span>
        </h1>
        <div className="ornament reveal d4">
          <span className="line"></span>
          <span className="lozenge"></span>
          <span className="line"></span>
        </div>
      </main>

      <p className="decree reveal d5">Semper ad astra</p>
    </>
  );
}
