import { css } from 'lit';

export const ergoStyles = css`
  .oneliner {
    border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
    border-radius: 12px;
    padding: 10px 14px;
    color: inherit;
    font-size: 13px;
    margin-bottom: 12px;
    background: var(--card-bg, transparent);
  }
  .oneliner details p {
    opacity: 0.7;
    margin-top: 6px;
  }

  details.inline {
    display: block;
    margin-top: 6px;
  }
  details.inline summary {
    cursor: pointer;
    color: var(--primary-color, #4f7cff);
    font-size: 12.5px;
    list-style: none;
  }
  details.inline summary::before {
    content: '▸ ';
  }
  details.inline[open] summary::before {
    content: '▾ ';
  }
  details.inline p,
  details.inline ol {
    margin: 6px 0 0 4px;
    font-size: 12.5px;
    opacity: 0.7;
  }
  details.inline summary::-webkit-details-marker {
    display: none;
  }

  .ptiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }
  .ptile {
    background: var(--card-bg, transparent);
    border: 1.5px solid var(--divider-color, rgba(255, 255, 255, 0.14));
    border-radius: 13px;
    padding: 12px;
    text-align: left;
    cursor: pointer;
    color: inherit;
    display: flex;
    flex-direction: column;
    gap: 3px;
    font: inherit;
  }
  .ptile .pic {
    font-size: 20px;
  }
  .ptile b {
    font-size: 13.5px;
  }
  .ptile i {
    font-style: normal;
    opacity: 0.65;
    font-size: 11.5px;
    line-height: 1.35;
  }
  .ptile.on {
    border-color: var(--sc, var(--primary-color, #4f7cff));
    background: color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 10%, transparent);
    box-shadow: 0 0 16px color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 25%, transparent);
  }
  .chipok {
    color: #9fe8c6;
    font-size: 11px;
    margin-top: 3px;
  }
  .chipmut {
    opacity: 0.65;
    font-size: 11px;
    margin-top: 3px;
  }
`;
