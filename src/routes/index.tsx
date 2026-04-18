import { createFileRoute } from '@tanstack/react-router';

import Popup from '~/components/popup/Popup';

const Index = () => <Popup />;

export const Route = createFileRoute('/')({
  component: Index,
});
