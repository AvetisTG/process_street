import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Moment from 'moment';
import { extendMoment } from 'moment-range';
const moment = extendMoment(Moment);
import './CalendarWeekday.scss';

const propTypes = {
	// The current view date
	viewDate: PropTypes.instanceOf(Date),
	// The day start hours in 24 hour time. Must be 0-23
	dayStartHour: PropTypes.number,
	// The day end hours in 24 hour time. Must be 0-23
	dayEndHour: PropTypes.number,
	// Function to render events in the days where there is any
	renderEvent: PropTypes.func.isRequired,
	// Function to render all day events label text
	renderAllDayEvent: PropTypes.func.isRequired,
	// Called when an hour segment is clicked
	hourClick: PropTypes.func,
	// Called when an event title is clicked
	eventClick: PropTypes.func,
	// The number of days in a week. Can be used to create a shorter or longer week view.
	// The first day of the week will always be the viewDate and weekStartsOn if set will be ignored
	daysInWeek: PropTypes.number,
	// Show table header with day of the week
	showHeader: PropTypes.bool,
	// Highlight in blur color current day
	highlightCurrentDay: PropTypes.bool,
	// An array of events to display on view
	events: PropTypes.arrayOf(
		PropTypes.shape({
			id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
			date: PropTypes.instanceOf(Date),
			endDate: PropTypes.instanceOf(Date),
			color: PropTypes.string,
		}),
	),
};

const defaultProps = {
	daysInWeek: 1,
	showHeader: false,
	highlightCurrentDay: false,
	events: [],
	dayStartHour: 0,
	dayEndHour: 23,
};

class CalendarWeekday extends React.Component {
	constructor({ daysInWeek, viewDate }) {
		super();

		this.state = {
			cellWidth: 0,
			days: this.calculateDays(daysInWeek, viewDate),
		};

		this.handleResize = this.handleResize.bind(this);
		this.handleHourClick = this.handleHourClick.bind(this);
		this.handleEventClick = this.handleEventClick.bind(this);
		this.setCellRef = this.setCellRef.bind(this);
	}

	componentDidMount() {
		window.addEventListener('resize', this.handleResize);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.handleResize);
	}

	// TODO: This lifecycle will continue to work until version 17. Fix it after React upgrade
	componentWillReceiveProps({ daysInWeek, viewDate }) {
		this.setState({ days: this.calculateDays(daysInWeek, viewDate) });
	}

	calculateDays(daysInWeek, viewDate) {
		const days = [];
		// Cell element is needed to calculate width for events
		this.cellElement = null;

		while (daysInWeek) {
			days.push(moment(viewDate).add(--daysInWeek, 'days'));
		}

		return days.reverse();
	}

	setCellRef(element) {
		if (!this.cellElement) {
			this.cellElement = element;
			this.updateCellSizeState();
		}
	}

	updateCellSizeState() {
		if (this.cellElement) {
			this.setState({ cellWidth: this.cellElement.clientWidth });
		}
	}

	handleResize() {
		this.updateCellSizeState();
	}

	handleHourClick(event) {
		const { currentTarget } = event;
		const { hours, minutes, index } = currentTarget.dataset;
		const date = this.state.days[index].clone();
		date.hours(hours)
			.minutes(minutes)
			.seconds(0);

		this.props.hourClick(date.toDate());
	}

	handleEventClick(e) {
		e.stopPropagation();

		const { eventClick, events } = this.props;
		const { eventid } = e.currentTarget.dataset;

		if (eventClick) {
			eventClick(events.find(event => `${event.id}` === `${eventid}`));
		}
	}

	renderCurrentTime() {
		const { dayStartHour, dayEndHour } = this.props;
		const currentDate = new Date();
		const currentWeek = this.state.days.find(day => day.isSame(moment(), 'day'));

		if (!currentWeek) {
			return null;
		}

		// Check if current time belongs to the provided period
		const isBetween = currentDate.getHours() >= dayStartHour && currentDate.getHours() <= dayEndHour;
		const topOffset =
			(currentDate.getHours() - dayStartHour) * (CalendarWeekday.ROW_HEIGHT * 2) + currentDate.getMinutes();

		return isBetween ? <div className="CalendarWeekday__CurrentTime" style={{ top: topOffset }} /> : null;
	}

	renderEvents(weekday) {
		const { renderEvent, dayStartHour } = this.props;
		const { cellWidth } = this.state;

		if (!cellWidth) {
			return null;
		}

		const events = [...this.props.events]
			.filter(
				event =>
					moment(event.date).isSame(moment(event.endDate), 'day') &&
					moment(event.date).isSame(weekday, 'day') &&
					!moment(event.date).isSame(moment(event.endDate)),
			)
			.sort((a, b) => (a.date > b.date ? 1 : -1));

		return events.map(event => {
			const topOffset =
				(event.date.getHours() - dayStartHour) * (CalendarWeekday.ROW_HEIGHT * 2) + event.date.getMinutes();
			const height = (event.endDate.getTime() - event.date.getTime()) / (60 * 1000);
			const overlappingEvents = events.filter(nextEvent => {
				const eventRange = moment().range(moment(event.date), moment(event.endDate));
				const nextEventRange = moment().range(moment(nextEvent.date), moment(nextEvent.endDate));
				return (
					nextEventRange.contains(moment(event.date)) ||
					nextEventRange.contains(moment(event.endDate)) ||
					eventRange.contains(moment(nextEvent.date)) ||
					eventRange.contains(moment(nextEvent.endDate))
				);
			});
			const countBefore = overlappingEvents.indexOf(event);
			const gap = 5;

			let width = cellWidth / (overlappingEvents.length || 1);
			const leftOffset = countBefore * width + ((countBefore ? 2 : 1) * gap);


			width = width - (countBefore
				? countBefore + 1 === overlappingEvents.length
					? gap * 3
					: gap
				: !countBefore && overlappingEvents.length === 1
					? gap * 2
					: 0);

			const eventStyles = {
				width,
				top: topOffset,
				left: leftOffset,
				height: height < 30 ? 30 : height,
			};
			const contentStyles = {
				backgroundColor: event.color,
			};
			const className = classNames('CalendarWeekday__Event', {
				'CalendarWeekday__Event-overlapped': countBefore !== overlappingEvents.length - 1,
			});

			return (
				<div key={event.id} className={className} style={eventStyles}>
					<div
						className={classNames('CalendarWeekday__EventContent', {
							'CalendarWeekday__EventContent-small': height === 30,
						})}
						data-eventid={event.id}
						onClick={this.handleEventClick}
						style={contentStyles}
					>
						<div className="CalendarWeekday__EventContent-overlay"/>
						{renderEvent(event)}
					</div>
				</div>
			);
		});
	}

	renderRows() {
		const { dayStartHour, dayEndHour, highlightCurrentDay } = this.props;
		const { days } = this.state;
		const rows = [];

		for (let hours = dayStartHour; hours <= dayEndHour; hours++) {
			const formattedHours = hours < 10 ? `0${hours}` : hours;
			let time = `${hours}:00`;

			rows.push(
				<tr className="CalendarWeekday__row" key={time}>
					<td
						data-hours={hours}
						data-index={0}
						data-minutes={0}
						onClick={this.handleHourClick}
						className="CalendarWeekday__cell CalendarWeekday__hour">{formattedHours}:00</td>
					{days.map((weekday, index) => (
						<td
							className={classNames('CalendarWeekday__cell', {
								'CalendarWeekday__cell-today': highlightCurrentDay && weekday.isSame(moment(), 'day'),
							})}
							key={weekday.format()}
							data-hours={hours}
							data-index={index}
							data-minutes={0}
							onClick={this.handleHourClick}
						>
							{!rows.length && <div ref={this.setCellRef}>{this.renderEvents(weekday)}</div>}
						</td>
					))}
				</tr>,
			);

			time = `${hours}:30`;
			rows.push(
				<tr className="CalendarWeekday__row" key={time}>
					<td	data-hours={hours}
						data-index={0}
						data-minutes={30}
						onClick={this.handleHourClick}
						className="CalendarWeekday__cell CalendarWeekday__cell-divided CalendarWeekday__hour" />
					{days.map((weekday, index) => (
						<td
							className={classNames('CalendarWeekday__cell CalendarWeekday__cell-divided', {
								'CalendarWeekday__cell-today': highlightCurrentDay && weekday.isSame(moment(), 'day'),
							})}
							key={weekday.format() + ':30'}
							data-hours={hours}
							data-index={index}
							data-minutes={30}
							onClick={this.handleHourClick}
						/>
					))}
				</tr>,
			);
		}

		return rows;
	}

	renderAllDayEvents() {
		const { renderAllDayEvent } = this.props;
		const allDayEvents = this.props.events.filter(
			event =>
				!moment(event.date).isSame(moment(event.endDate), 'day') ||
				moment(event.date).isSame(moment(event.endDate)),
		);

		if (!allDayEvents.length) {
			return null;
		}

		const events = this.state.days.map(weekday => {
			const eventList = allDayEvents
				.filter(event => {
					return moment(event.date).isSame(moment(event.endDate))
						? weekday.isSame(moment(event.date), 'day')
						: weekday.isBetween(moment(event.date), moment(event.endDate), null, '[)');
				})
				.map(event => (
					<div
						className="CalendarWeekday__AllDayEvent"
						key={event.id}
						data-eventid={event.id}
						onClick={this.handleEventClick}
						style={{ backgroundColor: event.color }}
					>
						<div className="CalendarWeekday__AllDayEvent-overlay"/>
						{renderAllDayEvent(event)}
					</div>
				));

			return (
				<td className="CalendarWeekday__AllDayCell" key={`all-day-${weekday.day()}`}>
					{eventList}
				</td>
			);
		});

		return (
			<tr>
				<td />
				{events}
			</tr>
		);
	}

	renderHeader() {
		const { highlightCurrentDay } = this.props;

		return this.state.days.map(weekday => (
			<th
				key={weekday.format() + 'day'}
				className={classNames('CalendarWeekday__HeaderCell', {
					'CalendarWeekday__HeaderCell-today': highlightCurrentDay && weekday.isSame(moment(), 'day'),
				})}
			>
				<div className="CalendarWeekday__DayOfWeek">{weekday.format('ddd')}</div>
				<div className="CalendarWeekday__DayOfMonth">{weekday.format('D')}</div>
			</th>
		));
	}

	render() {
		const { showHeader } = this.props;
		const { days } = this.state;

		return (
			<div className="CalendarWeekday">
				<table className="CalendarWeekday__table" cellPadding="0" cellSpacing="0">
					<colgroup>
						<col className="CalendarWeekday__ColHour" />
						<col span={days.length} />
					</colgroup>
					{showHeader && (
						<thead>
							<tr>
								<td className="CalendarWeekday__HeaderCell" />
								{this.renderHeader()}
							</tr>
						</thead>
					)}
					<tbody>{this.renderAllDayEvents()}</tbody>
					<tbody>
						<tr>
							<td className="CalendarWeekday__CurrentTimeCell" colSpan={1 + days.length}>
								{this.renderCurrentTime()}
							</td>
						</tr>
						{this.renderRows()}
					</tbody>
				</table>
			</div>
		);
	}
}

CalendarWeekday.propTypes = propTypes;
CalendarWeekday.defaultProps = defaultProps;
CalendarWeekday.ROW_HEIGHT = 30;
CalendarWeekday.HOUR_COL_WIDTH = 35;

export default CalendarWeekday;
