import {ResetPassword} from '@/components/reset-password';
export const metadata={title:'Reset password',robots:{index:false,follow:false}};
export default function ResetPasswordPage(){return <main id="main-content" className="wrap admin-page"><div className="admin-login"><p className="eyebrow">PRIVATE PUBLISHING DESK</p><h1>Choose a new password.</h1><p>Enter a new password for your administrator account.</p><ResetPassword/></div></main>}
