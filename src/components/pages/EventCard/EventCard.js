import React, { Component } from "react";
import Timer from "../../Timer";
import { connect } from "react-redux";
import { withRouter, Link } from "react-router-dom";
import { getAllEvents } from "../../../actions/dataActions";
import { extractDateString } from "../../../utils/utils";
import axios from "axios";
import api from "../../../config/keys";
import roles from "../../../config/Roles";
import Header from "./Header";
import Body from "./Body";
import Footer from "./Footer";

class EventCard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      auth: {},
      event: {},
      loading: true,
      isRegistered: false,
      deadlineEnded: true,
      member2: "",
      member3: "",
      member4: "",
      member5: "",
      teamName: "",
    };
  }

  de = () => {
    let now = new Date();
    return new Date(this.props.event.deadline) - now <= 0;
  };

  static defaultProps = {
    event: {
      title: "",
      description: "",
      deadline: Date.now,
      venue: "",
      usersRegistered: [],
    },
  };

  static getDerivedStateFromProps(props) {
    if (props.auth) {
      return {
        auth: props.auth,
      };
    }
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.auth.isAuthenticated === true &&
      this.props.auth.isAuthenticated === false
    ) {
      this.setState({ isRegistered: false });
    }
  }

  endDeadline = () => {
    this.setState({ deadlineEnded: this.de() });
  };

  componentDidMount() {
    const { event } = this.props;
    const { auth } = this.props;
    const { usersRegistered } = event;
    if (auth.isAuthenticated) {
      if (event.type === "MULTIPLE") {
        const ifRegistered = usersRegistered.filter(
          (team) =>
            team.Member_1_Email === auth.user.email ||
            team.Member_2_Email === auth.user.email ||
            team.Member_3_Email === auth.user.email ||
            team.Member_4_Email === auth.user.email ||
            team.Member_5_Email === auth.user.email
        );

        if (ifRegistered.length > 0) {
          this.setState({ isRegistered: true });
        }
      } else {
        const { usersRegistered } = this.props.event;
        const ifRegistered = usersRegistered.filter(
          (user) => user.user.toString() === this.state.auth.user.id
        );

        if (ifRegistered.length > 0) {
          this.setState({ isRegistered: true });
        }
      }
    }
    this.setState({ deadlineEnded: this.de() });
  }

  onClickRegisterSingle = () => {
    const { user, isAuthenticated } = this.state.auth;
    if (isAuthenticated) {
      if (user.isProfileCreated) {
        const { _id } = this.props.event;
        const user_id = this.state.auth.user.id;

        axios.get(`${api}/profile/${user_id}`).then((res) => {
          if (res.data) {
            axios
              .post(`${api}/event/${_id}/register-user`, { user: res.data })
              .then((res) => {
                if (res.data) {
                  this.setState({ isRegistered: true });
                  axios
                    .put(`${api}/profile/add-registered-event/id`, {
                      eventId: _id,
                    })
                    .then((res) => {
                      if (res.data) {
                        console.log("registered!");
                      }
                    })
                    .catch((err) => {
                      console.log(err);
                    });
                }
              })
              .catch((err) => console.log(err));
          }
        });
      } else {
        alert("Please create your profile to register on an event.");
        this.props.history.push("/dashboard/profile");
      }
    } else {
      this.props.history.push("/login");
    }
  };

  toggleTeamForm = () => {
    const { isAuthenticated } = this.state.auth;
    if (isAuthenticated) {
      const { event } = this.props;
      const form = document.querySelector(`#team-${event._id.toString()}`);
      form.classList.toggle("team-register-show");
    } else {
      this.props.history.push("/login");
    }
  };

  CloseMultiForm = () => {
    const { event } = this.props;
    const form = document.querySelector(`#team-${event._id.toString()}`);
    form.classList.remove("team-register-show");
  };

  onClickRegisterMultiple = (e) => {
    e.preventDefault();
    const { user } = this.state.auth;

    if (user.isProfileCreated) {
      const { auth, teamName } = this.state;
      const event = this.props.event;

      let users = [];
      users.push(auth.user.email);

      for (let i = 0; i < event.members - 1; i++) {
        users.push(this.state[`member${i + 2}`]);
      }
      // console.log(users);
      axios
        .post(`${api}/profile/emails`, {
          emails: users,
        })
        .then((res) => {
          if (res.data) {
            const { _id } = this.props.event;
            let registerData = {};
            registerData.teamName = teamName;
            res.data.map((profile, i) => {
              registerData[`Member_${i + 1}_Name`] = profile.fullName;
              registerData[`Member_${i + 1}_Email`] = profile.email;
              registerData[`Member_${i + 1}_Phone`] = profile.phone;
              registerData[`Member_${i + 1}_E_ID`] = profile.enrollment_id;
              registerData[`Member_${i + 1}_Course`] = profile.course;
              registerData[`Member_${i + 1}_Institute`] = profile.institute;
            });

            axios
              .post(`${api}/event/${_id}/register-user`, {
                user: registerData,
                type: event.type,
              })
              .then((res) => {
                if (res.data) {
                  this.setState({ isRegistered: true });
                  this.CloseMultiForm();
                  users.forEach((email) => {
                    axios
                      .put(`${api}/profile/add-registered-event/email`, {
                        email,
                        eventId: _id,
                      })
                      .then((res) => {
                        if (res.data) {
                          console.log("success");
                        }
                      })
                      .catch((err) => console.log(err));
                  });
                }
              });
          }
        });
    } else {
      alert("Please create your profile to register on an event.");
      this.props.history.push("/dashboard/profile");
    }
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  render() {
    let registerButton = <></>;
    const { event } = this.props;
    const des = event.description.substring(0, 100);

    if (event.type === "MULTIPLE") {
      registerButton = (
        <button onClick={this.toggleTeamForm} className="button-secondary">
          Submit Team
        </button>
      );
    } else {
      registerButton = (
        <button
          className="button-secondary"
          onClick={this.onClickRegisterSingle}
        >
          Register
        </button>
      );
    }

    const { isRegistered, deadlineEnded, auth } = this.state;
    return (
      <div className="event-card">
        {event.type === "MULTIPLE" && (
          <div id={`team-${event._id.toString()}`} className="team-register">
            <button
              type="button"
              className="team-register__close"
              onClick={this.CloseMultiForm}
            >
              x
            </button>
            <form className="form" onSubmit={this.onClickRegisterMultiple}>
              <h1 className="heading-primary">
                Submit Team ({`${event.members} Members`})
              </h1>
              <hr className="hr ma" />
              <br />
              <div>
                <strong>Leader: </strong>
                {auth.user.email}
              </div>
              {[...Array(event.members - 1)].map((e, i) => (
                <>
                  <input
                    type="email"
                    name={`member${i + 2}`}
                    placeholder={`Email of team member ${i + 2}`}
                    onChange={this.onChange}
                    required
                  />
                  <br />
                </>
              ))}

              <input
                type="text"
                name="teamName"
                placeholder="Team Name"
                onChange={this.onChange}
                value={this.state.teamName}
              ></input>
              <br />
              <button className="button-secondary">Submit</button>
              <br />
              <small>
                *Note: Please make sure all the members are registered to the
                website before you submit.
              </small>
            </form>
          </div>
        )}

        <Header
          deadlineEnded={deadlineEnded}
          heading={event.title}
          isRegistered={isRegistered}
        />
        <Body
          description={event.description}
          venue={event.venue}
          date={event.date}
          endDeadline={this.endDeadline}
          deadline={event.deadline}
          deadlineEnded={deadlineEnded}
        />
        <hr></hr>
        <Footer
          deadlineEnded={deadlineEnded}
          auth={auth}
          event={event}
          registerSingle={this.onClickRegisterSingle}
          isRegistered={isRegistered}
          toggleMultipleRegister={this.toggleTeamForm}
          history={this.props.history}
        ></Footer>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  auth: state.auth,
});

export default connect(mapStateToProps, { getAllEvents })(
  withRouter(EventCard)
);
