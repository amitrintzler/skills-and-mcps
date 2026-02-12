import React from 'react';
import { Composition } from 'remotion';

import { ExplainerVideo, walkthroughDurationInFrames } from '../commands/ExplainerVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FrameworkWalkthrough"
        component={ExplainerVideo}
        durationInFrames={walkthroughDurationInFrames}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
