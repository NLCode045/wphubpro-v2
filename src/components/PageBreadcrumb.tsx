import {Link} from "react-router";
import {BreadcrumbItem} from 'react-bootstrap'
import {TbChevronRight} from 'react-icons/tb'
import PageMetaData from "@/components/PageMetaData.tsx";

type PageBreadcrumbProps = {
    title: string
    subtitle?: string
}

const PageBreadcrumb = ({title, subtitle}: PageBreadcrumbProps) => {
    return (
        <>
            <PageMetaData title={title} />
            <div className="page-title-head d-flex align-items-center">
                <div className="flex-grow-1">
                    <h4 className="fs-xl fw-bold m-0">{title}</h4>
                </div>
                <div className="text-end">
                    <div className="breadcrumb m-0 py-0 d-flex align-items-center gap-1">
                        <BreadcrumbItem linkAs={Link} href="">
                            UBold
                        </BreadcrumbItem>{' '}
                        <TbChevronRight/>
                        {subtitle && (
                            <>
                                <BreadcrumbItem linkAs={Link} href="">
                                    {subtitle}
                                </BreadcrumbItem>{' '}
                                <TbChevronRight/>
                            </>
                        )}
                        <BreadcrumbItem active>{title}</BreadcrumbItem>
                    </div>
                </div>
            </div>
        </>
    )
}

export default PageBreadcrumb
