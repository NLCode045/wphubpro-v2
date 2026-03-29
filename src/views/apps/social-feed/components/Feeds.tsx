import { Button, Card, Row, Col, CardBody, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, FormCheck } from 'react-bootstrap'
import {Link} from "react-router";
import {
    TbArrowBackUp,
    TbBellPlus,
    TbCamera,
    TbDotsVertical,
    TbEdit,
    TbFlag,
    TbHeart,
    TbHeartFilled,
    TbLogin,
    TbMapPin,
    TbMoodSmile,
    TbPin,
    TbQuote,
    TbShare,
    TbShare3,
    TbTrash, TbTrophy,
    TbUser,
} from 'react-icons/tb'
import type { CommentType, FeedCardType } from '@/views/apps/social-feed/types'


import user1 from '@/assets/images/users/user-1.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import user6 from '@/assets/images/users/user-6.jpg'
import user10 from '@/assets/images/users/user-10.jpg'

import gallery1 from '@/assets/images/stock/gallery-1.jpg'
import gallery2 from '@/assets/images/stock/gallery-2.jpg'
import gallery3 from '@/assets/images/stock/gallery-3.jpg'
import { Fragment } from 'react'
import clsx from 'clsx'

const PostCard = () => {
  return (
    <Card>
      <CardBody>
        <h5 className="mb-2">What's on your mind?</h5>

        <form action="#">
          <textarea rows={3} className="form-control" placeholder="Share your thoughts..."></textarea>

          <div className="d-flex pt-2 justify-content-between align-items-center">
            <div className="d-flex gap-1">
              <Button variant="light" size="sm" className="btn-icon" title="Tag People">
                <TbUser className="fs-md" />
              </Button>
              <Button variant="light" size="sm" className="btn-icon" title="Add Location">
                <TbMapPin className="fs-md" />
              </Button>
              <Button variant="light" size="sm" className="btn-icon" title="Upload Photo">
                <TbCamera className="fs-md" />
              </Button>
              <Button variant="light" size="sm" className="btn-icon" title="Add Emoji">
                <TbMoodSmile className="fs-md" />
              </Button>
            </div>

            <button type="submit" className="btn btn-dark btn-sm">
              Post
            </button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

const CommonPostCard = ({ name, time, children, avatar, description }: FeedCardType) => {
  return (
    <Card>
      <CardBody className="pb-2">
        <div className="d-flex align-items-center mb-2">
          <img className="me-2 avatar-md rounded-circle" src={avatar} alt="Generic placeholder image" />
          <div className="w-100">
            <h5 className="m-0">
              <Link to="/users/profile" className="link-reset">
                {name}
              </Link>
            </h5>
            <p className="text-muted mb-0">
              <small>{time}</small>
            </p>
          </div>
          <Dropdown className="ms-auto">
            <DropdownToggle as={'button'} className="bg-transparent border-0 text-muted drop-arrow-none card-drop p-0">
              <TbDotsVertical className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end" className="dropdown-menu-end">
              <DropdownItem as={Link} to="">
                <TbEdit className="me-2" />
                Edit Post
              </DropdownItem>
              <DropdownItem as={Link} to="">
                <TbTrash className="me-2" />
                Delete Post
              </DropdownItem>
              <DropdownItem as={Link} to="">
                <TbShare className="me-2" />
                Share
              </DropdownItem>
              <DropdownItem as={Link} to="">
                <TbPin className="me-2" />
                Pin to Top
              </DropdownItem>
              <DropdownItem as={Link} to="">
                <TbFlag className="me-2" />
                Report Post
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
        {description && <p>{description}</p>}
        {children}

        <div className="mt-2">
          <Link to="" className="btn btn-sm fs-sm btn-link text-muted">
            <TbArrowBackUp className="me-1" /> Reply
          </Link>
          <span className="btn btn-sm fs-sm btn-link text-muted" data-toggler="on">
            <span data-toggler-on className="align-middle">
              <TbHeartFilled className="text-danger" /> Liked!
            </span>
            <span data-toggler-off className="d-none align-middle">
              <TbHeart className="text-muted" /> Like
            </span>
          </span>
          <Link to="" className="btn btn-sm fs-sm btn-link text-muted">
            <TbShare3 className="me-1" /> Share
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}

const Post1 = () => {
  return (
    <CommonPostCard
      avatar={user10}
      name={'Jeremy Tomlinson'}
      time={'about 2 minutes ago'}
      description="Story based around the idea of time lapse, animation to post soon!">
      <Row className="g-1">
        <Col md={6}>
          <img src={gallery1} className="img-fluid w-100 h-100 rounded" style={{ aspectRatio: '3/4', objectFit: 'cover' }} alt="Tall Image" />
        </Col>

        <Col md={6} className="d-flex flex-column gap-1">
          <img src={gallery2} className="img-fluid w-100 rounded" style={{ aspectRatio: '4/3', objectFit: 'cover' }} alt="Top Right" />
          <img src={gallery3} className="img-fluid w-100 rounded" style={{ aspectRatio: '4/3', objectFit: 'cover' }} alt="Bottom Right" />
        </Col>
      </Row>
    </CommonPostCard>
  )
}

const Post2 = () => {
  const comments: CommentType[] = [
    {
      avatar: user1,
      message: "That sounds awesome! Can't wait to see how you designed the UI.",
      name: 'Liam Johnson',
      time: '10 minutes ago',
      reply: [
        {
          avatar: user2,
          message: "I'm excited to see the final result! Let me know when you're ready to share.",
          name: 'Sophia Martinez',
          time: '5 minutes ago',
        },
      ],
    },
  ]
  return (
    <CommonPostCard
      avatar={user4}
      name="Sophia Martinez"
      time="about 30 minutes ago"
    >
        <div className="fs-16 text-center mt-3 mb-4 fst-italic">
          <TbQuote className="fs-20" />
          Just finished a weekend project! Built a small weather app using React and OpenWeather API. Feeling excited to share the results with
          everyone soon. 🚀
        </div>
      <div className="bg-light-subtle mx-n3 p-3 border-top border-bottom border-dashed">
        {comments.map((comment, idx) => (
          <div className={clsx('d-flex align-items-start', { 'mb-2': comments.length > 1 })} key={idx}>
            <img className="me-2 avatar-sm rounded-circle" src={comment.avatar} alt="Generic placeholder image" />
            <div className="w-100">
              <h5 className="mt-0 mb-1">
                <Link to="/users/profile" className="link-reset">
                  {comment.name}
                </Link>{' '}
                <small className="text-muted fw-normal float-end">{comment.time}</small>
              </h5>
              {comment.message}
              <br />
              {comment.reply && (
                <>
                  <Link to="" className="text-muted font-13 d-inline-block mt-2">
                    <TbArrowBackUp /> Reply
                  </Link>
                  {comment.reply.map((reply, idx) => (
                    <Fragment key={idx}>
                      <div className="d-flex align-items-start mt-3">
                        <Link className="pe-2" to="">
                          <img src={reply.avatar} className="avatar-sm rounded-circle" alt="Generic placeholder image" />
                        </Link>
                        <div className="w-100">
                          <h5 className="mt-0 mb-1">
                            <Link to="/users/profile" className="link-reset">
                              {reply.name}
                            </Link>{' '}
                            <small className="text-muted fw-normal float-end">{reply.time}</small>
                          </h5>
                          {reply.message}
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </>
              )}
            </div>
          </div>
        ))}

        <div className="d-flex align-items-start mt-3">
          <Link className="pe-2" to="">
            <img src={user3} className="rounded-circle" alt="Generic placeholder image" height="31" />
          </Link>
          <div className="w-100">
            <input type="text" id="simpleinput" className="form-control form-control-sm" placeholder="Add a comment..." />
          </div>
        </div>
      </div>
    </CommonPostCard>
  )
}

const Post3 = () => {
  return (
    <CommonPostCard
      avatar={user2}
      name="Anika Roy"
      time={'2 hours ago'}
      description="Sharing a couple of timelapses from my recent Iceland trip. Let me know which one you like most!">
      <Row className="g-2">
        <Col md={6}>
          <div className="ratio ratio-16x9 rounded overflow-hidden">
            <iframe src="https://player.vimeo.com/video/1084537" allowFullScreen></iframe>
          </div>
        </Col>
        <Col md={6}>
          <div className="ratio ratio-16x9 rounded overflow-hidden">
            <iframe src="https://player.vimeo.com/video/76979871" allowFullScreen></iframe>
          </div>
        </Col>
      </Row>
    </CommonPostCard>
  )
}

const Post4 = () => {
  return (
    <CommonPostCard avatar={user6} name={'David Kim'} time={'Posted 1 hour ago'}>
      <h5 className="mb-3">🔥 Quick Poll: What’s your go-to front-end framework in 2025?</h5>
      <p className="text-muted">We’re gathering developer preferences for our next project. Cast your vote below! 💻</p>
      <form>
        <FormCheck type="radio" className="mb-1" name="framework_poll" id="optionReact" label="React (Meta)" />
        <FormCheck type="radio" className="mb-1" name="framework_poll" id="optionVue" label="Vue.js (Evan You)" />
        <FormCheck type="radio" className="mb-1" name="framework_poll" id="optionAngular" label="Angular (Google)" />
        <FormCheck type="radio" className="mb-3" name="framework_poll" id="optionSvelte" label="Svelte (Rich Harris)" />

        <Button variant="primary" size="sm" type="submit">
          Submit Vote
        </Button>
      </form>
    </CommonPostCard>
  )
}

const Post5=()=>{
  return(
<CommonPostCard avatar={user2} name={'Anika roy'} time={'Posted 2 hours ago'}>
  <h5 className="mb-2">
    📢 You're Invited: <strong>Dev Meetup 2025 – Build with AI</strong>
  </h5>
  <p className="text-muted mb-2">
    Join developers and tech enthusiasts for an inspiring evening of AI-driven development talks, live demos, and networking opportunities.
  </p>
  <ul className="list-unstyled mb-3">
    <li className="pb-2">
      <strong>Date:</strong> Friday, 25th July 2025
    </li>
    <li className="pb-2">
      <strong>Time:</strong> 6:00 PM IST
    </li>
    <li>
      <strong>Location:</strong> Online (Zoom – link to be shared)
    </li>
  </ul>

  <div className="d-flex gap-2">
    <button className="btn btn-sm btn-outline-primary">
      <TbBellPlus className="me-1"/> Interested
    </button>
    <button className="btn btn-sm btn-primary">
      <TbLogin className="me-1"/> Join Now
    </button>
  </div>
</CommonPostCard>
  )
}

const AchievementPost=()=>{
  return(
    <Card>
      <CardBody className="text-center">
        <h1 className="mb-2">🏆</h1>
        <h4 className="mb-1 fw-semibold">Congratulations, Anika! 🎉</h4>

        <p className="text-muted fst-italic mb-3">
          You’ve hit <strong>1,000 followers</strong>! Your content is making waves in the community!
        </p>

        <div className="d-flex justify-content-center mb-3">
          <div className="me-4 text-center">
            <h6 className="mb-0">Posts</h6>
            <span className="fw-bold">135</span>
          </div>
          <div className="me-4 text-center">
            <h6 className="mb-0">Likes</h6>
            <span className="fw-bold">8,400</span>
          </div>
          <div className="text-center">
            <h6 className="mb-0">Followers</h6>
            <span className="fw-bold">1,000</span>
          </div>
        </div>

        <button className="btn btn-sm btn-outline-success me-2">
          <TbShare className="me-1"/> Share Achievement
        </button>
        <Link to="/users/profile" className="btn btn-sm btn-primary">
          <TbTrophy className="me-1" /> View Profile
        </Link>
      </CardBody>
    </Card>
  )
}

const Feeds = () => {
  return (
    <>
      <PostCard />

      <Post1 />

      <Post2 />

      <Post3 />

      <Post4 />

    <Post5/>

   <AchievementPost/>

      <div className="d-flex align-items-center justify-content-center gap-2 p-3 mb-3">
        <strong>Loading...</strong>
        <div className="spinner-border spinner-border-sm text-danger" role="status" aria-hidden="true"></div>
      </div>
    </>
  )
}

export default Feeds
