import {
  createRouter,
  createRootRoute,
  createRoute,
  createHashHistory,
  Outlet,
} from '@tanstack/react-router';
import { ProjectListPage } from './ProjectListPage';
import { EditorPage } from './editor/EditorPage';
import { TtsPage } from './TtsPage';
import { AssetsPage } from './AssetsPage';
import { GrokPage } from './GrokPage';
import { ImageGenPage } from './ImageGenPage';
import { ChatPage } from './ChatPage';
import { AboutPage } from './AboutPage';
import { SettingsPage } from './SettingsPage';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ProjectListPage,
});

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/editor/$projectId',
  component: EditorPage,
});

const ttsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tts',
  component: TtsPage,
});

const assetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/assets',
  component: AssetsPage,
});

const grokRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/grok',
  component: GrokPage,
});

const imagegenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/imagegen',
  component: ImageGenPage,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chat',
  component: ChatPage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  projectsRoute,
  editorRoute,
  ttsRoute,
  assetsRoute,
  grokRoute,
  imagegenRoute,
  chatRoute,
  aboutRoute,
  settingsRoute,
]);

// Electron file:// 에서는 hash history 사용
const hashHistory = createHashHistory();

export const router = createRouter({ routeTree, history: hashHistory });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
