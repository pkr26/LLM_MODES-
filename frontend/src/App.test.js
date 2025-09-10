import { render } from '@testing-library/react';
import App from './App';

// Mock the stores
jest.mock('./stores/authStore', () => ({
  __esModule: true,
  default: () => ({
    initializeAuth: jest.fn(),
    isAuthenticated: false,
    isLoading: false,
    clearError: jest.fn(),
  }),
}));

jest.mock('./stores/chatStore', () => ({
  __esModule: true,
  default: () => ({
    initialize: jest.fn(),
  }),
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }) => <div data-testid="router">{children}</div>,
  Navigate: () => <div data-testid="navigate">Redirecting...</div>,
  Routes: ({ children }) => <div data-testid="routes">{children}</div>,
  Route: ({ element }) => <div data-testid="route">{element}</div>,
  useNavigate: () => jest.fn(),
}));

test('renders the app without crashing', () => {
  const { container } = render(<App />);
  
  // Check that the app renders without crashing
  const appDiv = container.querySelector('.App');
  expect(appDiv).toBeInTheDocument();
});
