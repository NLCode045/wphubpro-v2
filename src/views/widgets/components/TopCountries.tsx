import ComponentCard from '@/components/cards/ComponentCard'

import {Link} from "react-router";
import { TbWorld } from 'react-icons/tb'
import { CountriesData } from '../data.ts'

const TopCountries = () => {
    return (
        <ComponentCard isCollapsible title="Traffic Sources" isCloseable isRefreshable >
            {
                CountriesData.map((item, idx) => (
                    <div className="d-flex align-items-center gap-2 mb-3" key={idx}>
                        <img src={item.flag} alt="India" className="avatar-xxs rounded" />
                        <h5 className="mb-0 fw-medium">
                            <Link to="" className="link-reset">{item.name}</Link> <small className="text-muted">Pop: {item.population}</small>
                        </h5>
                        <div className="ms-auto">
                            <div className="d-flex align-items-center gap-3 text-end">
                                <p className="mb-0 fw-medium">{item.value.toLocaleString()}</p>
                                <p className={`badge badge-label fs-xxs badge-soft-${item.change.type} mb-0`}>{item.change.type == 'success' ? '+' : '-'}{item.change.percent}%</p>
                            </div>
                        </div>
                    </div>
                ))
            }
            <div className="text-center mt-4">
                <Link to="/chat" className="link-reset text-decoration-underline fw-semibold link-offset-3">
                    View all Countries <TbWorld />
                </Link>
            </div>
        </ComponentCard>
    )
}

export default TopCountries