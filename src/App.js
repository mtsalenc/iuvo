import React, { Component } from 'react'
import ResponsiveDrawerContainer from '../src/components/drawer/ResponsiveDrawerContainer'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
import './App.css'
import LoginPageContainer from './components/login/LoginPageContainer'

class App extends Component {
  render () {
    const { userData } = this.props
    userData.initialized = true
    return (
      <div className='App'>
        {userData.initialized
          ? (<ResponsiveDrawerContainer currentPage='Home'>
            {this.props.children}
          </ResponsiveDrawerContainer>)
          : <LoginPageContainer />
        }
      </div>
    )
  }
}

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = ({ userData }) => {
  return {
    userData
  }
}

App.contextTypes = {
  drizzle: PropTypes.object
}

export default drizzleConnect(App, mapStateToProps)
