import React from 'react';
import {AbsoluteFill} from 'remotion';

type Props = {
  controlPanelUrl: string;
};

export const PanelDeControlComposition: React.FC<Props> = ({controlPanelUrl}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#f6f1ea',
        color: '#201914',
        fontFamily: 'SF Pro Text, Helvetica Neue, Helvetica, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 32px 18px 32px',
          borderBottom: '1px solid #d8cab8',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: -1,
            }}
          >
            Panel de control
          </div>
          <div
            style={{
              fontSize: 18,
              color: '#6d635b',
              marginTop: 4,
            }}
          >
            Herramientas actuales del proyecto dentro de Remotion Studio
          </div>
        </div>
        <div
          style={{
            fontSize: 14,
            color: '#6d635b',
            border: '1px solid #d8cab8',
            borderRadius: 10,
            padding: '8px 12px',
            backgroundColor: '#fffdfa',
          }}
        >
          {controlPanelUrl}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          padding: 22,
        }}
      >
        <iframe
          src={controlPanelUrl}
          title="Panel de control"
          style={{
            width: '100%',
            height: '100%',
            border: '1px solid #d8cab8',
            borderRadius: 14,
            backgroundColor: '#ffffff',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
