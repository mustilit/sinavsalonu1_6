/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import About from './pages/About';
import AdminDashboard from './pages/AdminDashboard';
import CompleteProfile from './pages/CompleteProfile';
import Contact from './pages/Contact';
import CreateTest from './pages/CreateTest';
import EditTest from './pages/EditTest';
import EducatorDashboard from './pages/EducatorDashboard';
import EducatorProfile from './pages/EducatorProfile';
import EducatorSettings from './pages/EducatorSettings';
import Educators from './pages/Educators';
import ExamTypes from './pages/ExamTypes';
import Explore from './pages/Explore';
import Home from './pages/Home';
import ManageExamTypes from './pages/ManageExamTypes';
import ManageRefunds from './pages/ManageRefunds';
import ManageTests from './pages/ManageTests';
import ManageTopics from './pages/ManageTopics';
import ManageUsers from './pages/ManageUsers';
import MyDiscountCodes from './pages/MyDiscountCodes';
import MyResults from './pages/MyResults';
import MySales from './pages/MySales';
import MyTestPackages from './pages/MyTestPackages';
import MyTests from './pages/MyTests';
import Partnership from './pages/Partnership';
import Privacy from './pages/Privacy';
import ProfileSettings from './pages/ProfileSettings';
import QuestionReports from './pages/QuestionReports';
import SelectExamTypes from './pages/SelectExamTypes';
import Support from './pages/Support';
import TakeTest from './pages/TakeTest';
import TestDetail from './pages/TestDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AdminDashboard": AdminDashboard,
    "CompleteProfile": CompleteProfile,
    "Contact": Contact,
    "CreateTest": CreateTest,
    "EditTest": EditTest,
    "EducatorDashboard": EducatorDashboard,
    "EducatorProfile": EducatorProfile,
    "EducatorSettings": EducatorSettings,
    "Educators": Educators,
    "ExamTypes": ExamTypes,
    "Explore": Explore,
    "Home": Home,
    "ManageExamTypes": ManageExamTypes,
    "ManageRefunds": ManageRefunds,
    "ManageTests": ManageTests,
    "ManageTopics": ManageTopics,
    "ManageUsers": ManageUsers,
    "MyDiscountCodes": MyDiscountCodes,
    "MyResults": MyResults,
    "MySales": MySales,
    "MyTestPackages": MyTestPackages,
    "MyTests": MyTests,
    "Partnership": Partnership,
    "Privacy": Privacy,
    "ProfileSettings": ProfileSettings,
    "QuestionReports": QuestionReports,
    "SelectExamTypes": SelectExamTypes,
    "Support": Support,
    "TakeTest": TakeTest,
    "TestDetail": TestDetail,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};