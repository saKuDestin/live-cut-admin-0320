/*
 * App.tsx - 直播切片大师前台客户端
 * 根路径 / 展示此页面
 */
import { Router, Route, Switch } from "wouter";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Router base="/">
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

export default App;
