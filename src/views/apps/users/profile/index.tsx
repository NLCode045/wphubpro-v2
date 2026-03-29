import PageBreadcrumb from '@/components/PageBreadcrumb'
import profileBg from '@/assets/images/profile-bg.jpg'
import {Container} from 'react-bootstrap'
import Profile from './components/Profile.tsx'
import Account from './components/Account.tsx'

const Page = () => {
    return (
        <Container fluid>
            <PageBreadcrumb title="Profile" subtitle="Users" />
            <div className="row">
                <div className="col-12">
                    <article className="card overflow-hidden mb-0">
                        <div className="position-relative card-side-img overflow-hidden" style={{ minHeight: 300, backgroundImage: `url(${profileBg})` }}>
                            <div className="p-4 card-img-overlay rounded-start-0 auth-overlay d-flex align-items-center flex-column justify-content-center">
                                <h3 className="text-white mb-1 fst-italic">"Crafting innovation through clean design"</h3>
                                <p className="text-white mb-4">– MyStatus</p>
                            </div>
                        </div>
                    </article>
                </div>
            </div>
            <div className="px-3 mt-n4">
                <div className="row">
                    <div className="col-xl-4">
                        <Profile />
                    </div>
                    <div className="col-xl-8">
                        <Account />
                    </div>
                </div>
            </div>
        </Container>
    )
}

export default Page