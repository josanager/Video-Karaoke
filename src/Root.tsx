import {Composition} from 'remotion';
import {KaraokeComposition} from './compositions/KaraokeComposition';
import {PanelDeControlComposition} from './compositions/PanelDeControlComposition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="panel-de-control"
        component={PanelDeControlComposition}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={900}
        defaultProps={{
          controlPanelUrl: 'http://127.0.0.1:5000',
        }}
      />
      <Composition
        id="karaoke"
        component={KaraokeComposition}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={450}
        defaultProps={{
          title: 'Nuevo karaoke',
          artist: 'Artista',
          currentLine: 'Esta es la linea activa del karaoke',
          nextLine: 'La siguiente linea aparece aqui',
          accentColor: '#b45309',
        }}
      />
    </>
  );
};
